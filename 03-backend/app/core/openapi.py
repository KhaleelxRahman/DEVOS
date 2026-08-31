from fastapi import FastAPI

def configure_openapi(app: FastAPI):
    app.title = "DEVOS API"
    app.version = "1.0.0"
    app.description = "Professional Full Stack Developer API"
