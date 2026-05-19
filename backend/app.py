from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_community.vectorstores import FAISS
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnablePassthrough, RunnableParallel, RunnableLambda
from langchain_core.output_parsers import StrOutputParser

load_dotenv(override=True)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins = ["chrome-extension://nadjbmbhndbghcimohegacckjdlkmlkc"],
    allow_credentials= True,
    allow_methods=["*"],
    allow_headers=["*"]
)

class VectorStoreState:
    def __init__(self):
        self.vector_store = None
        self.chain = None
        self.video_id = None
        
store = VectorStoreState()

class InitializeRequest(BaseModel):
    video_id:str
    
class QuestionRequest(BaseModel):
    question:str
    
class InitializeResponse(BaseModel):
    success: bool
    message: str
    video_id: str
    
class AnswerResponse(BaseModel):
    answer: str
    sources: list
    
def format_docs(retrieved_docs):
    return "\n\n".join(doc.page_content for doc in retrieved_docs)

@app.post("/initialize", response_model=InitializeResponse)
async def initialize(request: InitializeRequest):
    try: 
        video_id = request.video_id
        
        try: 
            transcript_list = YouTubeTranscriptApi().fetch(video_id=video_id, languages=['en'])
            transcript = " ".join(chunk.text for chunk in transcript_list)
        except TranscriptsDisabled:
            raise HTTPException(status_code=400, detail= "Transcripts are disabled for this video.")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Could not fetch transcript: {str(e)}")
    
        splitter = RecursiveCharacterTextSplitter(chunk_size = 1000, chunk_overlap = 200)
        chunks = splitter.create_documents([transcript])
        
        if not chunks:
            raise HTTPException(status_code=400, detail="No transcript chunks created because nothing to process.")
        
        embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
        vector_store = FAISS.from_documents(documents=chunks, embedding=embeddings)
        
        retriever = vector_store.as_retriever(search_type="similarity", search_kwargs={"k": 4})
        
        prompt = PromptTemplate(
            template=""" 
                You are a helpful assistant. Answer only from the provided transcript context.
                If the context is insufficient, just say you don't know.
                
                {context}
                
                Question: {question}
            """,
            input_variables=['context', 'question']
        )
        
        llm = ChatOpenAI(model="gpt-5-mini", temperature=0.2)
        
        parallel_chain = RunnableParallel({
            "context": retriever | RunnableLambda(format_docs),
            "question": RunnablePassthrough()
        })
        
        parser = StrOutputParser()
        
        main_chain = parallel_chain | prompt | llm | parser
        
        store.vector_store = vector_store
        store.chain = main_chain
        store.video_id = video_id
        
        return InitializeResponse(success=True, message="Vector store and RAG chain initialized successfully.", video_id=video_id)
        
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Initialization failed: {str(e)}")
    
    
@app.post("/ask", response_model=AnswerResponse)
async def ask(request: QuestionRequest):
    if store.chain is None or store.vector_store is None:
        raise HTTPException(status_code=400, detail="Vector store and chain not initialized.")
    
    try: 
        question = request.question
        answer = store.chain.invoke(question)
        
        retriever = store.vector_store.as_retriever(search_type="similarity", search_kwargs={"k": 2})
        docs = retriever.invoke(question)
        sources = [doc.page_content for doc in docs]
        
        return AnswerResponse(answer=answer, sources=sources)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing question: {str(e)}")
    
    
@app.post("/health")
async def health():
    return {"status": "ok"} 


@app.post("/reset")
async def reset():
    store.vector_store = None
    store.chain = None
    store.video_id = None
    
    return {"success": True, "message": "State reset successfully."}


# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run(app, host="127.0.0.1", port=8000)