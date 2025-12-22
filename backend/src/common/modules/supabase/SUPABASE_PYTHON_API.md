# Supabase Python Client API Reference

> Version: 2.25.1  
> GitHub: https://github.com/supabase/supabase-py  
> Official Docs: https://supabase.com/docs/reference/python/introduction

---

## Initializing

```python
import os
from supabase import create_client, Client

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)
```

---

## Database (PostgREST)

### Fetch data

```python
response = supabase.table("planets").select("*").execute()
```

### Insert data

```python
response = supabase.table("planets").insert({"id": 1, "name": "Pluto"}).execute()
```

### Update data

```python
response = supabase.table("instruments").update({"name": "piano"}).eq("id", 1).execute()
```

### Upsert data

```python
response = supabase.table("instruments").upsert({"id": 1, "name": "piano"}).execute()
```

### Delete data

```python
response = supabase.table("countries").delete().eq("id", 1).execute()
```

### Call a Postgres function

```python
response = supabase.rpc("hello_world").execute()
```

---

## Using Filters

> **Important**: Filters must be applied after `select()`, not before.

```python
# Correct
response = supabase.table("instruments").select("name, section_id").eq("name", "flute").execute()

# Incorrect
response = supabase.table("instruments").eq("name", "flute").select("name, section_id").execute()
```

### eq - Column is equal to a value

```python
response = supabase.table("planets").select("*").eq("name", "Earth").execute()
```

### neq - Column is not equal to a value

```python
response = supabase.table("planets").select("*").neq("name", "Earth").execute()
```

### gt - Column is greater than a value

```python
response = supabase.table("planets").select("*").gt("id", 2).execute()
```

### gte - Column is greater than or equal to a value

```python
response = supabase.table("planets").select("*").gte("id", 2).execute()
```

### lt - Column is less than a value

```python
response = supabase.table("planets").select("*").lt("id", 2).execute()
```

### lte - Column is less than or equal to a value

```python
response = supabase.table("planets").select("*").lte("id", 2).execute()
```

### like - Column matches a pattern

```python
response = supabase.table("planets").select("*").like("name", "%Ea%").execute()
```

### ilike - Column matches a case-insensitive pattern

```python
response = supabase.table("planets").select("*").ilike("name", "%ea%").execute()
```

### is_ - Column is a value (null/true/false)

```python
response = supabase.table("planets").select("*").is_("name", "null").execute()
```

### in_ - Column is in an array

```python
response = supabase.table("planets").select("*").in_("name", ["Earth", "Mars"]).execute()
```

### contains - Column contains every element in a value

```python
response = supabase.table("issues").select("*").contains("tags", ["is:open", "priority:low"]).execute()
```

### contained_by - Contained by value

```python
response = supabase.table("classes").select("name").contained_by("days", ["monday", "tuesday", "wednesday", "friday"]).execute()
```


### range_gt - Greater than a range

```python
response = supabase.table("reservations").select("*").range_gt("during", ["2000-01-02 08:00", "2000-01-02 09:00"]).execute()
```

### range_gte - Greater than or equal to a range

```python
response = supabase.table("reservations").select("*").range_gte("during", ["2000-01-02 08:30", "2000-01-02 09:30"]).execute()
```

### range_lt - Less than a range

```python
response = supabase.table("reservations").select("*").range_lt("during", ["2000-01-01 15:00", "2000-01-01 16:00"]).execute()
```

### range_lte - Less than or equal to a range

```python
response = supabase.table("reservations").select("*").range_lte("during", ["2000-01-01 14:00", "2000-01-01 16:00"]).execute()
```

### range_adjacent - Mutually exclusive to a range

```python
response = supabase.table("reservations").select("*").range_adjacent("during", ["2000-01-01 12:00", "2000-01-01 13:00"]).execute()
```

### overlaps - With a common element

```python
response = supabase.table("issues").select("title").overlaps("tags", ["is:closed", "severity:high"]).execute()
```

### text_search - Match a string (Full-text search)

```python
response = supabase.table("texts").select("content").text_search("content", "'eggs' & 'ham'", options={"config": "english"}).execute()
```

### match - Match an associated value

```python
response = supabase.table("planets").select("*").match({"id": 2, "name": "Earth"}).execute()
```

### not_ - Don't match the filter

```python
response = supabase.table("planets").select("*").not_.is_("name", "null").execute()
```

### or_ - Match at least one filter (OR)

```python
response = supabase.table("planets").select("name").or_("id.eq.2,name.eq.Mars").execute()
```

### filter - Match the filter (generic)

```python
response = supabase.table("planets").select("*").filter("name", "in", '("Mars","Tatooine")').execute()
```

---

## Using Modifiers

### order - Order the results

```python
response = supabase.table("planets").select("*").order("name", desc=True).execute()
```

### limit - Limit the number of rows returned

```python
response = supabase.table("planets").select("name").limit(1).execute()
```

### range - Limit the query to a range

```python
response = supabase.table("planets").select("name").range(0, 1).execute()
```

### single - Retrieve one row of data

```python
response = supabase.table("planets").select("name").limit(1).single().execute()
```

### maybe_single - Retrieve zero or one row of data

```python
response = supabase.table("planets").select("*").eq("name", "Earth").maybe_single().execute()
```

### csv - Retrieve as a CSV

```python
response = supabase.table("planets").select("*").csv().execute()
```

### explain - Using explain

```python
response = supabase.table("planets").select("*").explain().execute()
```

---

## Auth

### Create a new user

```python
response = supabase.auth.sign_up({"email": "email@example.com", "password": "password"})
```

### Create an anonymous user

```python
response = supabase.auth.sign_in_anonymously({"options": {"captcha_token": ""}})
```

### Sign in a user

```python
response = supabase.auth.sign_in_with_password({"email": "email@example.com", "password": "example-password"})
```

### Sign in with ID token (native sign-in)

```python
response = supabase.auth.sign_in_with_id_token({"provider": "google", "token": "your-id-token"})
```

### Sign in a user through OTP

```python
response = supabase.auth.sign_in_with_otp({"email": "email@example.com", "options": {"email_redirect_to": "https://example.com/welcome"}})
```

### Sign in a user through OAuth

```python
response = supabase.auth.sign_in_with_oauth({"provider": "github"})
```

### Sign in a user through SSO

```python
response = supabase.auth.sign_in_with_sso({"domain": "company.com"})
```

### Get user claims from verified JWT

```python
response = supabase.auth.get_claims()
```

### Sign out a user

```python
response = supabase.auth.sign_out()
```

### Send a password reset request

```python
supabase.auth.reset_password_for_email(email, {"redirect_to": "https://example.com/update-password"})
```

### Verify and log in through OTP

```python
response = supabase.auth.verify_otp({"email": "email@example.com", "token": "123456", "type": "email"})
```

### Retrieve a session

```python
response = supabase.auth.get_session()
```

### Retrieve a new session

```python
response = supabase.auth.refresh_session()
```

### Retrieve a user

```python
response = supabase.auth.get_user()
```

### Update a user

```python
response = supabase.auth.update_user({"email": "new@email.com"})
```

### Retrieve identities linked to a user

```python
response = supabase.auth.get_user_identities()
```

### Link an identity to a user

```python
response = supabase.auth.link_identity({"provider": "github"})
```

### Unlink an identity from a user

```python
response = supabase.auth.get_user_identities()
google_identity = list(filter(lambda identity: identity.provider == "google", res.identities)).pop()
response = supabase.auth.unlink_identity(google_identity)
```

### Send a password reauthentication nonce

```python
response = supabase.auth.reauthenticate()
```

### Resend an OTP

```python
response = supabase.auth.resend({"type": "signup", "email": "email@example.com", "options": {"email_redirect_to": "https://example.com/welcome"}})
```

### Set the session data

```python
response = supabase.auth.set_session(access_token, refresh_token)
```

### Exchange an auth code for a session

```python
response = supabase.auth.exchange_code_for_session({"auth_code": "34e770dd-9ff9-416c-87fa-43b31d7ef225"})
```


---

## Auth MFA

### Enroll a factor

```python
response = supabase.auth.mfa.enroll({"factor_type": "totp", "friendly_name": "your_friendly_name"})
```

### Create a challenge

```python
response = supabase.auth.mfa.challenge({"factor_id": "34e770dd-9ff9-416c-87fa-43b31d7ef225"})
```

### Verify a challenge

```python
response = supabase.auth.mfa.verify({"factor_id": "34e770dd-9ff9-416c-87fa-43b31d7ef225", "challenge_id": "4034ae6f-a8ce-4fb5-8ee5-69a5863a7c15", "code": "123456"})
```

### Create and verify a challenge

```python
response = supabase.auth.mfa.challenge_and_verify({"factor_id": "34e770dd-9ff9-416c-87fa-43b31d7ef225", "code": "123456"})
```

### Unenroll a factor

```python
response = supabase.auth.mfa.unenroll({"factor_id": "34e770dd-9ff9-416c-87fa-43b31d7ef225"})
```

### Get Authenticator Assurance Level

```python
response = supabase.auth.mfa.get_authenticator_assurance_level()
```

---

## Auth Admin

```python
from supabase import create_client
from supabase.lib.client_options import ClientOptions

supabase = create_client(supabase_url, service_role_key, options=ClientOptions(auto_refresh_token=False, persist_session=False))
admin_auth_client = supabase.auth.admin
```

### Retrieve a user

```python
response = supabase.auth.admin.get_user_by_id(1)
```

### List all users

```python
response = supabase.auth.admin.list_users()
```

### Create a user

```python
response = supabase.auth.admin.create_user({"email": "user@email.com", "password": "password", "user_metadata": {"name": "Yoda"}})
```

### Delete a user

```python
supabase.auth.admin.delete_user("715ed5db-f090-4b8c-a067-640ecee36aa0")
```

### Send an email invite link

```python
response = supabase.auth.admin.invite_user_by_email("email@example.com")
```

### Generate an email link

```python
response = supabase.auth.admin.generate_link({"type": "signup", "email": "email@example.com", "password": "secret"})
```

### Update a user

```python
response = supabase.auth.admin.update_user_by_id("11111111-1111-1111-1111-111111111111", {"email": "new@email.com"})
```

### Delete a factor for a user

```python
response = supabase.auth.admin.mfa.delete_factor({"id": "34e770dd-9ff9-416c-87fa-43b31d7ef225", "user_id": "a89baba7-b1b7-440f-b4bb-91026967f66b"})
```

---

## OAuth Admin

### List OAuth clients

```python
response = supabase.auth.admin.oauth.list_clients()
```

### Get OAuth client

```python
response = supabase.auth.admin.oauth.get_client("client-id")
```

### Create OAuth client

```python
response = supabase.auth.admin.oauth.create_client({"name": "My OAuth Client", "redirect_uris": ["https://example.com/callback"]})
```

### Update OAuth client

```python
response = supabase.auth.admin.oauth.update_client("client-id", {"name": "Updated OAuth Client", "redirect_uris": ["https://example.com/callback", "https://example.com/callback2"]})
```

### Delete OAuth client

```python
supabase.auth.admin.oauth.delete_client("client-id")
```

### Regenerate client secret

```python
response = supabase.auth.admin.oauth.regenerate_client_secret("client-id")
```

---

## Edge Functions

### Invoke a Supabase Edge Function

```python
response = supabase.functions.invoke("hello-world", invoke_options={"body": {"name": "Functions"}})
```

---

## Realtime (Async Client)

### Overview

```python
import os
import asyncio
from supabase import acreate_client, AsyncClient

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")

async def create_supabase():
    supabase: AsyncClient = await acreate_client(url, key)
    return supabase
```

### Subscribe to channel

```python
channel = supabase.channel("room1")

def on_subscribe(status, err):
    if status == RealtimeSubscribeStates.SUBSCRIBED:
        asyncio.create_task(channel.send_broadcast("cursor-pos", {"x": random.random(), "y": random.random()}))

def handle_broadcast(payload):
    print("Cursor position received!", payload)

await channel.on_broadcast(event="cursor-pos", callback=handle_broadcast).subscribe(on_subscribe)
```

### Unsubscribe from a channel

```python
await supabase.remove_channel(myChannel)
```

### Unsubscribe from all channels

```python
await supabase.remove_all_channels()
```

### Retrieve all channels

```python
channels = supabase.get_channels()
```

### Broadcast a message

```python
channel = supabase.channel("room1")

def on_subscribe(status, err):
    if status == RealtimeSubscribeStates.SUBSCRIBED:
        asyncio.create_task(channel.send_broadcast('cursor-pos', {"x": random.random(), "y": random.random()}))

await channel.subscribe(on_subscribe)
```


---

## Storage - File Buckets

### List all buckets

```python
response = supabase.storage.list_buckets()
```

### Retrieve a bucket

```python
response = supabase.storage.get_bucket("avatars")
```

### Create a bucket

```python
response = supabase.storage.create_bucket("avatars", options={"public": False, "allowed_mime_types": ["image/png"], "file_size_limit": 1024})
```

### Empty a bucket

```python
response = supabase.storage.empty_bucket("avatars")
```

### Update a bucket

```python
response = supabase.storage.update_bucket("avatars", options={"public": False, "allowed_mime_types": ["image/png"], "file_size_limit": 1024})
```

### Delete a bucket

```python
response = supabase.storage.delete_bucket("avatars")
```

### Upload a file

```python
with open("./public/avatar1.png", "rb") as f:
    response = supabase.storage.from_("avatars").upload(file=f, path="public/avatar1.png", file_options={"cache-control": "3600", "upsert": "false"})
```

### Replace an existing file

```python
with open("./public/avatar1.png", "rb") as f:
    response = supabase.storage.from_("avatars").update(file=f, path="public/avatar1.png", file_options={"cache-control": "3600", "upsert": "true"})
```

### Move an existing file

```python
response = supabase.storage.from_("avatars").move("public/avatar1.png", "private/avatar2.png")
```

### Copy an existing file

```python
response = supabase.storage.from_("avatars").copy("public/avatar1.png", "private/avatar2.png")
```

### Create a signed URL

```python
response = supabase.storage.from_("avatars").create_signed_url("folder/avatar1.png", 60)
```

### Create signed URLs

```python
response = supabase.storage.from_("avatars").create_signed_urls(["folder/avatar1.png", "folder/avatar2.png"], 60)
```

### Create signed upload URL

```python
response = supabase.storage.from_("avatars").create_signed_upload_url("folder/avatar1.png")
```

### Upload to a signed URL

```python
with open("./public/avatar1.png", "rb") as f:
    response = supabase.storage.from_("avatars").upload_to_signed_url(path="folder/cat.jpg", token="token-from-create_signed_upload_url", file=f)
```

### Retrieve public URL

```python
response = supabase.storage.from_("avatars").get_public_url("folder/avatar1.jpg")
```

### Download a file

```python
with open("./myfolder/avatar1.png", "wb+") as f:
    response = supabase.storage.from_("avatars").download("folder/avatar1.png")
    f.write(response)
```

### Delete files in a bucket

```python
response = supabase.storage.from_("avatars").remove(["folder/avatar1.png"])
```

### List all files in a bucket

```python
response = supabase.storage.from_("avatars").list("folder", {"limit": 100, "offset": 0, "sortBy": {"column": "name", "order": "desc"}})
```

---

## Storage - Analytics Buckets

### Create a new analytics bucket

```python
response = supabase.storage.analytics().create("analytics-bucket")
```

### List analytics buckets

```python
response = supabase.storage.analytics().list()
```

### Delete an analytics bucket

```python
response = supabase.storage.analytics().delete("analytics-bucket")
```

---

## Storage - Vector Buckets

### Create a vector bucket

```python
supabase.storage.vectors().create_bucket("vectors-bucket")
```

### Delete a vector bucket

```python
supabase.storage.vectors().delete_bucket("vectors-bucket")
```

### Retrieve a vector bucket

```python
response = supabase.storage.vectors().get_bucket("vectors-bucket")
```

### List all vector buckets

```python
response = supabase.storage.vectors().list_buckets()
```

### Create a vector index

```python
supabase.storage.vectors().from_("vectors-bucket").create_index(index_name="my-index", dimension=128, distance_metric="cosine", data_type="float32")
```

### Delete a vector index

```python
supabase.storage.vectors().from_("vectors-bucket").delete_index("my-index")
```

### Retrieve a vector index

```python
response = supabase.storage.vectors().from_("vectors-bucket").get_index("my-index")
```

### List all vector indexes

```python
response = supabase.storage.vectors().from_("vectors-bucket").list_indexes()
```

### Delete vectors from index

```python
supabase.storage.vectors().from_("vectors-bucket").index("my-index").delete(["vector-1", "vector-2"])
```

### Retrieve vectors from index

```python
response = supabase.storage.vectors().from_("vectors-bucket").index("my-index").get("vector-1")
```

### List vectors in index

```python
response = supabase.storage.vectors().from_("vectors-bucket").index("my-index").list()
```

### Add vectors to index

```python
supabase.storage.vectors().from_("vectors-bucket").index("my-index").put([{"key": "vector-1", "data": {"float32": [0.1, 0.2, 0.3]}, "metadata": {"category": "example"}}])
```

### Search vectors in index

```python
response = supabase.storage.vectors().from_("vectors-bucket").index("my-index").query(query_vector={"float32": [0.1, 0.2, 0.3]}, topK=10)
```

---

## Quick Reference - Filters

| Method | Description | Example |
|--------|-------------|---------|
| `eq(col, val)` | Equal | `.eq("name", "Earth")` |
| `neq(col, val)` | Not equal | `.neq("name", "Earth")` |
| `gt(col, val)` | Greater than | `.gt("id", 2)` |
| `gte(col, val)` | Greater than or equal | `.gte("id", 2)` |
| `lt(col, val)` | Less than | `.lt("id", 2)` |
| `lte(col, val)` | Less than or equal | `.lte("id", 2)` |
| `like(col, pattern)` | Pattern match (case-sensitive) | `.like("name", "%Ea%")` |
| `ilike(col, pattern)` | Pattern match (case-insensitive) | `.ilike("name", "%ea%")` |
| `is_(col, val)` | IS (null/true/false) | `.is_("name", "null")` |
| `in_(col, vals)` | In array | `.in_("name", ["A", "B"])` |
| `contains(col, val)` | Contains | `.contains("tags", ["a"])` |
| `contained_by(col, val)` | Contained by | `.contained_by("tags", ["a", "b"])` |
| `or_(filters)` | OR condition | `.or_("id.eq.1,id.eq.2")` |
| `not_.method()` | NOT | `.not_.is_("name", "null")` |
| `match(dict)` | Match multiple | `.match({"id": 1, "name": "A"})` |
| `filter(col, op, val)` | Generic filter | `.filter("name", "in", '("A","B")')` |

## Quick Reference - Modifiers

| Method | Description | Example |
|--------|-------------|---------|
| `order(col, desc=False)` | Order results | `.order("name", desc=True)` |
| `limit(count)` | Limit rows | `.limit(10)` |
| `range(start, end)` | Range (pagination) | `.range(0, 9)` |
| `single()` | Return single row (error if not exactly 1) | `.single()` |
| `maybe_single()` | Return single row or None | `.maybe_single()` |
| `csv()` | Return as CSV | `.csv()` |
| `explain()` | Explain query plan | `.explain()` |
