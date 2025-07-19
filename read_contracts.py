#!/usr/bin/env python3
import PyPDF2
import os
import sys
from pathlib import Path

def read_mountainshares_contracts():
    """Read MountainShares contract PDFs to extract pricing logic"""
    
    # Convert Windows path to WSL path
    base_path = Path("/mnt/d/1_MountainShares/Contracts/")
    
    # Priority contract files for pricing analysis
    contract_files = [
        "MountainShares Stripe Payment Gateway - Contract A.pdf",
        "💰 ETH Price Calculator Contract_ Streamlined Price.pdf",
        "💰 H4H Fee Distribution ETH Contract_ Advanced Reve.pdf", 
        "🪙 MountainShares Token Contract_ Core Economic Inf.pdf",
        "Backbone Contract (`0x746dD4D401ce5Bbb0Fc964E1a7b4.pdf",
        "MountainShares Darwin Gödel Machine_ AI-Powered Sy.pdf"
    ]
    
    print("=== MountainShares Contract Analysis ===\n")
    
    for contract_file in contract_files:
        file_path = base_path / contract_file
        
        print(f"Analyzing: {contract_file}")
        print(f"Path: {file_path}")
        
        if file_path.exists():
            try:
                with open(file_path, 'rb') as pdf_file:
                    pdf_reader = PyPDF2.PdfReader(pdf_file)
                    total_pages = len(pdf_reader.pages)
                    
                    print(f"✅ Found - {total_pages} pages")
                    
                    # Extract pricing-related content
                    pricing_content = []
                    
                    for page_num in range(min(5, total_pages)):
                        try:
                            page = pdf_reader.pages[page_num]
                            text = page.extract_text()
                            
                            # Search for pricing keywords
                            pricing_keywords = [
                                'price', 'fee', 'cost', 'token', 'calculate',
                                'variable', 'dynamic', 'percentage', '%',
                                'stripe', 'payment', 'transaction'
                            ]
                            
                            if any(keyword in text.lower() for keyword in pricing_keywords):
                                pricing_content.append(f"Page {page_num + 1}:\n{text[:800]}")
                        
                        except Exception as page_error:
                            print(f"Error reading page {page_num + 1}: {page_error}")
                    
                    # Output pricing content
                    if pricing_content:
                        print("📊 PRICING CONTENT FOUND:")
                        for content in pricing_content[:2]:  # Show first 2 relevant pages
                            print("-" * 50)
                            print(content)
                            print("-" * 50)
                    else:
                        print("ℹ️  No pricing content detected")
                        
            except Exception as e:
                print(f"❌ Error reading file: {e}")
        else:
            print(f"❌ File not found")
        
        print("\n" + "="*60 + "\n")

if __name__ == "__main__":
    print("MountainShares Contract Pricing Analysis Tool")
    print("=" * 50)
    read_mountainshares_contracts()
