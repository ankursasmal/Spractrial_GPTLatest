def build_explanation_prompt(
    matches,
    context
):

    match_text = ""

    for m in matches[:5]:

        match_text += f"""
Material: {m.get('material')}
Class: {m.get('class_name')}
Subclass: {m.get('subclass')}
Score: {m.get('accuracy', m.get('siamese_similarity'))}
"""

    prompt = f"""
You are an expert spectroscopy scientist.

Retrieved database context:

{context}

Top spectral matches:

{match_text}

Tasks:
1. Identify most probable material
2. Explain spectral similarity
3. Mention ambiguity if close matches exist
4. Explain confidence scientifically
5. Mention if material may be unknown
"""

    return prompt


def build_chat_prompt(
    question,
    context
):

    prompt = f"""
You are an expert spectroscopy assistant.

Use ONLY the following database context:

{context}

User question:
{question}

Provide a scientific answer.
"""

    return prompt