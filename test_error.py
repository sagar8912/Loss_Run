import os
import traceback
import sys

def test():
    try:
        import main
        print("Running main.main()...")
        main.main()
    except Exception as e:
        err = traceback.format_exc()
        print(f"FAILED: {e}")
        print(err)

if __name__ == "__main__":
    test()
