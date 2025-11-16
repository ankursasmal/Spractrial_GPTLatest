from pymongo import MongoClient

client = MongoClient('mongodb://localhost:27017/')

# Check spectralGpt database
db = client['spectralGpt']
print('Collections in spectralGpt:', db.list_collection_names())
for coll in db.list_collection_names():
    count = db[coll].count_documents({})
    print(f'  {coll}: {count} documents')
    if count > 0:
        sample = db[coll].find_one()
        print(f'    Sample keys: {list(sample.keys())}')

