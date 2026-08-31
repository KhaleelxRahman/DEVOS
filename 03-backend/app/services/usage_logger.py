from datetime import datetime

def log_usage(model:str,tokens:int):
    with open("logs/ai_usage.log","a",encoding="utf-8") as f:
        f.write(f"{datetime.now()} | {model} | {tokens}\n")
