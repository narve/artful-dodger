import sys
import os
import base64
import requests
import time
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.tif'}

def describe_image(path):
    path = Path(path)
    print(f"\n[{path.name}]", flush=True)
    with open(path, "rb") as f:
        img_b64 = base64.b64encode(f.read()).decode()
    try:
        resp = requests.post("http://localhost:11434/api/generate", json={
            "model": "moondream",
            "prompt": "Describe this image",
            "images": [img_b64],
            "stream": False
        }, timeout=60)
        resp.raise_for_status()
        print(resp.json()["response"], flush=True)
    except requests.RequestException as e:
        print(f"Error: {e}", flush=True)

def is_image(path):
    return Path(path).suffix.lower() in IMAGE_EXTENSIONS

class ImageHandler(FileSystemEventHandler):
    def on_created(self, event):
        if not event.is_directory and is_image(event.src_path):
            describe_image(event.src_path)

    def on_moved(self, event):
        if not event.is_directory and is_image(event.dest_path):
            describe_image(event.dest_path)

def process_directory(directory):
    dir_path = Path(directory).resolve()
    existing = sorted(f for f in dir_path.iterdir() if f.is_file() and is_image(f))
    if existing:
        print(f"Processing {len(existing)} existing image(s)...")
        for img in existing:
            describe_image(img)

    print(f"\nWatching {dir_path} for new images... (Ctrl+C to stop)")
    observer = Observer()
    observer.schedule(ImageHandler(), str(dir_path), recursive=False)
    observer.start()
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping.")
    finally:
        observer.stop()
        observer.join()

def main():
    if len(sys.argv) != 2:
        print(f"Usage: {sys.argv[0]} <image_or_directory>")
        sys.exit(1)

    target = sys.argv[1]

    if not os.path.exists(target):
        print(f"Error: '{target}' does not exist")
        sys.exit(1)

    if os.path.isdir(target):
        process_directory(target)
    elif os.path.isfile(target) and is_image(target):
        describe_image(target)
    else:
        print(f"Error: '{target}' is not a supported image file")
        sys.exit(1)

if __name__ == "__main__":
    main()
