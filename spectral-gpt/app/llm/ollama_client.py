import requests


OLLAMA_URL = "http://127.0.0.1:11434/api/generate"
MODEL_NAME = "llama3"


def ask_llm(prompt):

    try:
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": MODEL_NAME,
                "prompt": prompt,
                "stream": False
            },
            timeout=120
        )

        if response.status_code != 200:
            return f"Ollama error: {response.text}"

        data = response.json()

        return data.get(
            "response",
            "No response generated."
        )

    except Exception as e:
        return f"LLM unavailable: {str(e)}"