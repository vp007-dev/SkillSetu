import asyncio, websockets, json

async def test():
    try:
        uri = 'ws://127.0.0.1:8001/api/live?company=Google%20Cloud&role=Senior%20Full-Stack%20Software%20Engineer&candidate=Mohit%20Upraity&voice=Zephyr&format=Full%20Technical%20%26%20Coding'
        async with websockets.connect(uri) as ws:
            print('Connected to WebSocket')
            
            # Send setup packet
            await ws.send(json.dumps({
                'type': 'setup',
                'role': 'Senior Full-Stack Software Engineer',
                'seniority': 'Senior',
                'voice': 'Zephyr',
                'candidateName': 'Mohit Upraity',
                'interviewType': 'Full Technical & Coding',
                'company': 'Google Cloud',
                'customContext': 'Candidate Resume: Experienced Software Engineer with React, Python, FastAPI, Node.js skills.\nJob Description: Senior Full-Stack role at Google Cloud.',
            }))
            
            # Wait for messages
            try:
                msg = await asyncio.wait_for(ws.recv(), timeout=20)
                data = json.loads(msg)
                msg_type = data.get('type', 'unknown')
                print(f'Received message type: {msg_type}')
                if msg_type == 'ready':
                    print('SUCCESS: Gemini Live session is ready!')
                    print(f'Message: {data.get("message", "")}')
                elif msg_type == 'error':
                    print(f'ERROR: {data.get("message", "")}')
                elif msg_type == 'audio':
                    print(f'Got audio chunk: {len(data.get("data", ""))} bytes base64')
                elif msg_type == 'output_transcript':
                    print(f'AI Transcript: {data.get("text", "")[:100]}...')
                else:
                    print(f'Data: {json.dumps(data)[:200]}')
                    
            except asyncio.TimeoutError:
                print('Timeout waiting for response')
                
    except Exception as e:
        print(f'Connection error: {e}')
        import traceback
        traceback.print_exc()

asyncio.run(test())
