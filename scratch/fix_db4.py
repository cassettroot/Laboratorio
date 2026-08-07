with open('backend/database.py', 'r') as f:
    lines = f.readlines()

# Find the start of init_db
start_idx = -1
end_idx = -1
for i, line in enumerate(lines):
    if line.startswith('def init_db():'):
        start_idx = i
    elif start_idx != -1 and line.startswith('def ') and i > start_idx:
        end_idx = i
        break

if start_idx != -1 and end_idx != -1:
    print(f"Replacing lines {start_idx} to {end_idx}")
    # Replace lines
    pass
else:
    print(f"Start: {start_idx}, End: {end_idx}")
    
