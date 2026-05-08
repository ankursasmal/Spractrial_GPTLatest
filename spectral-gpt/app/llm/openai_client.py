import requests

OLLAMA_URL = "http://localhost:11434/api/generate"

def ask_llm(prompt):

    try:

        response = requests.post(
            OLLAMA_URL,
            json={
                "model": "llama3",
                "prompt": f"""
You are a spectroscopy expert.

{prompt}
                """,
                "stream": False
            }
        )

        data = response.json()

        return data.get(
            "response",
            "No response generated."
        )

    except Exception as e:

        return f"LLM Error: {str(e)}"