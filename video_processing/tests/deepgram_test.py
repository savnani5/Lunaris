import os
import time
from dotenv import load_dotenv

from deepgram import (
    DeepgramClient,
    PrerecordedOptions,
    FileSource,
)

load_dotenv()

# Path to the audio file
AUDIO_FILE = "/Users/parassavnani/Desktop/dev/downloads/Sid Khullar - RAAIS 2023 short/Sid Khullar - RAAIS 2023 short.mp3"

API_KEY = os.getenv("DG_API_KEY")


def main():
    try:
        # STEP 1 Create a Deepgram client using the API key
        deepgram = DeepgramClient(API_KEY)

        with open(AUDIO_FILE, "rb") as file:
            buffer_data = file.read()

        payload: FileSource = {
            "buffer": buffer_data,
        }

        #STEP 2: Configure Deepgram options for audio analysis
        options = PrerecordedOptions(
            model="nova-2",
            smart_format=True
        )

        # STEP 3: Call the transcribe_file method with the text payload and options
        tick = time.time()
        response = deepgram.listen.prerecorded.v("1").transcribe_file(payload, options)
        
        # STEP 4: Write the response to a file and print execution time
        with open("deepgram_response.json", "w") as output_file:
            output_file.write(response.to_json(indent=4))
        
        print(f"Response written to deepgram_response.json")
        print(f"Execution time: {time.time() - tick:.2f} seconds")

    except Exception as e:
        print(f"Exception: {e}")


if __name__ == "__main__":
    main()
