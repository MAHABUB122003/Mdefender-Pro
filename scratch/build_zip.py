import os
import zipfile

def build_plugin_zip():
    source_dir = r"d:\Documents_product\Mdefender-Pro\Mdefender-Pro\Mdefender\plugin_source\mdefender-pro"
    output_zip = r"d:\Documents_product\Mdefender-Pro\Mdefender-Pro\Mdefender\backend\downloads\mdefender-pro.zip"
    
    os.makedirs(os.path.dirname(output_zip), exist_ok=True)
    
    with zipfile.ZipFile(output_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(source_dir):
            for file in files:
                abs_path = os.path.join(root, file)
                rel_path = os.path.relpath(abs_path, source_dir)
                # Ensure zip path starts with mdefender-pro/ and uses forward slashes
                zip_entry_path = "mdefender-pro/" + rel_path.replace("\\", "/")
                zipf.write(abs_path, zip_entry_path)
                
    print(f"Successfully created standard ZIP: {output_zip}")

if __name__ == "__main__":
    build_plugin_zip()
