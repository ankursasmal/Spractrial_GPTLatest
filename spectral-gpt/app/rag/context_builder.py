def build_context_from_docs(docs):

    if not docs:
        return "No relevant spectral documents found."

    context_parts = []

    for idx, doc in enumerate(
        docs,
        start=1
    ):

        metadata = doc.get(
            "metadata",
            {}
        )

        material = metadata.get(
            "Name",
            "Unknown"
        )

        class_name = metadata.get(
            "Class",
            "Unknown"
        )

        subclass = metadata.get(
            "Subclass",
            "Unknown"
        )

        spectral_data = doc.get(
            "spectral_data",
            []
        )

        preview = spectral_data[:10]

        block = f"""
Document {idx}
Material: {material}
Class: {class_name}
Subclass: {subclass}
Spectral Preview: {preview}
"""

        context_parts.append(block)

    return "\n".join(
        context_parts
    )