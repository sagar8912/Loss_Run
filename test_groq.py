import os
from dotenv import load_dotenv
from utils_gpt import groq_call

def test_groq():
    print("Testing Groq API integration...")
    prompt = "Extract the company names and amount of claims from this text: Acme Corp had 3 claims totaling $50,000. Beta Inc had 0 claims."
    
    print(f"\nPrompt: {prompt}\n")
    
    output, in_tok, out_tok = groq_call(prompt, temperature=0)
    
    print("Response from Groq:\n")
    print(output)
    
    print(f"\nTokens used: Input={in_tok}, Output={out_tok}")

if __name__ == "__main__":
    test_groq()
