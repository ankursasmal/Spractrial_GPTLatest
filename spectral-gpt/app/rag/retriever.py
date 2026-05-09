from app.core.database import collection


def get_docs_from_matches(
    matches,
    limit=5
):

    docs = []

    for match in matches[:limit]:

        material = match.get("material")

        if not material:
            continue

        doc = collection.find_one(
            {
                "metadata.Name": material
            },
            {
                "_id": 0
            }
        )

        if doc:
            docs.append(doc)

    return docs


def search_docs_by_query(
    query,
    limit=5
):

    cursor = collection.find(
        {
            "$or": [
                {
                    "metadata.Name": {
                        "$regex": query,
                        "$options": "i"
                    }
                },
                {
                    "metadata.Class": {
                        "$regex": query,
                        "$options": "i"
                    }
                },
                {
                    "metadata.Subclass": {
                        "$regex": query,
                        "$options": "i"
                    }
                }
            ]
        },
        {
            "_id": 0
        }
    ).limit(limit)

    return list(cursor)