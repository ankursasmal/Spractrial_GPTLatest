def build_prompt(matches):

    context = ""

    for m in matches:

        context += f"""
        Material: {m['material']}
        Class: {m['class']}
        Accuracy: {m['accuracy']}
        """

    prompt = f"""
    Analyze the following spectral matching results.

    {context}

    Explain:
    1. probable material
    2. why spectrum matches
    3. scientific interpretation
    4. confidence level
    """

    return prompt