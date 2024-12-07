import os
import sys

def should_process_file(file_path):
    # Always include package-lock.json
    if file_path.endswith('package-lock.json'):
        return False
        
    try:
        # Try to open and read the first few bytes to check if it's readable
        with open(file_path, 'r', encoding='utf-8') as f:
            f.read(1)
            return True
    except:
        return False

def collect_files(start_path, output_file):
    # Get the absolute path of the script itself
    script_path = os.path.abspath(sys.argv[0])
    
    with open(output_file, 'w', encoding='utf-8') as out_file:
        for root, dirs, files in os.walk(start_path):
            # Skip node_modules directory
            if 'node_modules' in dirs:
                dirs.remove('node_modules')
            
            for file in files:
                file_path = os.path.join(root, file)
                # Skip if the file is the script itself
                if file_path == script_path:
                    continue
                    
                if should_process_file(file_path):
                    try:
                        with open(file_path, 'r', encoding='utf-8') as source_file:
                            content = source_file.read()
                            # Add some visual separation between files
                            out_file.write(f"\nFile: {file_path}\n")
                            out_file.write("=" * 80 + "\n")
                            out_file.write(content)
                            out_file.write("\n" + "=" * 80 + "\n\n")
                            
                            # Print progress
                            print(f"Processed: {file_path}")
                    except Exception as e:
                        error_msg = f"Error reading {file_path}: {str(e)}\n"
                        out_file.write(error_msg)
                        print(error_msg)

if __name__ == "__main__":
    current_directory = os.getcwd()
    output_file = "source_code_collection.txt"
    
    print(f"Starting to collect files from: {current_directory}")
    print("This will collect all readable text files and package-lock.json files...")
    
    collect_files(current_directory, output_file)
    print(f"\nFile collection complete. Results saved in {output_file}")
