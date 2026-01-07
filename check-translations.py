#!/usr/bin/env python3
import os
import re
import json
from pathlib import Path
from collections import defaultdict

# Directories to scan
SRC_DIR = "src"
TRANSLATIONS_DIR = "src/translations"

def extract_translation_keys_from_file(filepath):
    """Extract all translation keys used in a TypeScript/TSX file"""
    keys = set()
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
            # Match t('key') and t("key")
            pattern1 = r"t\(['\"]([^'\"]+)['\"]\)"
            # Match t(`key`)
            pattern2 = r"t\(`([^`]+)`\)"
            
            matches1 = re.findall(pattern1, content)
            matches2 = re.findall(pattern2, content)
            
            keys.update(matches1)
            keys.update(matches2)
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
    
    return keys

def extract_all_keys_from_translation_file(filepath):
    """Extract all keys defined in a translation file"""
    keys = set()
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
            # Simple regex to find key: value patterns
            # This matches patterns like: key: 'value', or key: {
            pattern = r"^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:"
            
            current_path = []
            for line in content.split('\n'):
                stripped = line.strip()
                
                # Skip comments and exports
                if stripped.startswith('//') or stripped.startswith('export'):
                    continue
                
                # Check for key definition
                match = re.match(pattern, line)
                if match:
                    key = match.group(1)
                    
                    # Check if it's an object (has { after :)
                    if '{' in line and not stripped.endswith('},'):
                        current_path.append(key)
                    else:
                        # It's a value
                        full_key = '.'.join(current_path + [key]) if current_path else key
                        keys.add(full_key)
                
                # Track closing braces
                if stripped == '},' or stripped == '}':
                    if current_path:
                        current_path.pop()
    
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
    
    return keys

def scan_component_files():
    """Scan all TypeScript/TSX files for translation key usage"""
    used_keys = set()
    files_scanned = 0
    
    for root, dirs, files in os.walk(SRC_DIR):
        # Skip translations directory
        if 'translations' in root:
            continue
            
        for file in files:
            if file.endswith(('.ts', '.tsx')) and not file.endswith('.d.ts'):
                filepath = os.path.join(root, file)
                keys = extract_translation_keys_from_file(filepath)
                used_keys.update(keys)
                if keys:
                    files_scanned += 1
    
    return used_keys, files_scanned

def main():
    print("=" * 60)
    print("TRANSLATION ANALYSIS REPORT")
    print("=" * 60)
    print()
    
    # Get all translation keys from files
    en_file = os.path.join(TRANSLATIONS_DIR, 'en.ts')
    de_file = os.path.join(TRANSLATIONS_DIR, 'de.ts')
    ar_file = os.path.join(TRANSLATIONS_DIR, 'ar.ts')
    
    print("📁 Analyzing translation files...")
    en_keys = extract_all_keys_from_translation_file(en_file)
    de_keys = extract_all_keys_from_translation_file(de_file)
    ar_keys = extract_all_keys_from_translation_file(ar_file)
    
    print(f"   EN keys: {len(en_keys)}")
    print(f"   DE keys: {len(de_keys)}")
    print(f"   AR keys: {len(ar_keys)}")
    print()
    
    # Check for missing keys between languages
    print("🔍 Checking for missing keys between languages...")
    print()
    
    missing_in_de = en_keys - de_keys
    missing_in_ar = en_keys - ar_keys
    extra_in_de = de_keys - en_keys
    extra_in_ar = ar_keys - en_keys
    
    if missing_in_de:
        print(f"❌ Keys missing in DE (present in EN): {len(missing_in_de)}")
        for key in sorted(missing_in_de)[:10]:
            print(f"   - {key}")
        if len(missing_in_de) > 10:
            print(f"   ... and {len(missing_in_de) - 10} more")
        print()
    
    if missing_in_ar:
        print(f"❌ Keys missing in AR (present in EN): {len(missing_in_ar)}")
        for key in sorted(missing_in_ar)[:10]:
            print(f"   - {key}")
        if len(missing_in_ar) > 10:
            print(f"   ... and {len(missing_in_ar) - 10} more")
        print()
    
    if extra_in_de:
        print(f"⚠️  Extra keys in DE (not in EN): {len(extra_in_de)}")
        for key in sorted(extra_in_de)[:10]:
            print(f"   - {key}")
        if len(extra_in_de) > 10:
            print(f"   ... and {len(extra_in_de) - 10} more")
        print()
    
    if extra_in_ar:
        print(f"⚠️  Extra keys in AR (not in EN): {len(extra_in_ar)}")
        for key in sorted(extra_in_ar)[:10]:
            print(f"   - {key}")
        if len(extra_in_ar) > 10:
            print(f"   ... and {len(extra_in_ar) - 10} more")
        print()
    
    if not (missing_in_de or missing_in_ar or extra_in_de or extra_in_ar):
        print("✅ All translation files have matching keys!")
        print()
    
    # Scan component files for usage
    print("📝 Scanning component files for translation usage...")
    used_keys, files_scanned = scan_component_files()
    print(f"   Scanned {files_scanned} files")
    print(f"   Found {len(used_keys)} unique translation keys in use")
    print()
    
    # Check for unused keys
    unused_keys = en_keys - used_keys
    if unused_keys:
        print(f"⚠️  Potentially unused keys in EN: {len(unused_keys)}")
        for key in sorted(unused_keys)[:15]:
            print(f"   - {key}")
        if len(unused_keys) > 15:
            print(f"   ... and {len(unused_keys) - 15} more")
        print()
    
    # Check for missing translations
    missing_translations = used_keys - en_keys
    if missing_translations:
        print(f"❌ Keys used in code but MISSING in EN translation: {len(missing_translations)}")
        for key in sorted(missing_translations):
            print(f"   - {key}")
        print()
    else:
        print("✅ All used keys exist in EN translation file!")
        print()
    
    # Summary
    print("=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Translation files sync:")
    print(f"  Missing in DE: {len(missing_in_de)}")
    print(f"  Missing in AR: {len(missing_in_ar)}")
    print(f"  Extra in DE: {len(extra_in_de)}")
    print(f"  Extra in AR: {len(extra_in_ar)}")
    print()
    print(f"Code usage:")
    print(f"  Keys used in code: {len(used_keys)}")
    print(f"  Missing translations: {len(missing_translations)}")
    print(f"  Potentially unused: {len(unused_keys)}")
    print()
    
    # Exit code
    if missing_translations or missing_in_de or missing_in_ar:
        print("❌ Translation issues found!")
        return 1
    else:
        print("✅ No critical translation issues!")
        return 0

if __name__ == "__main__":
    exit(main())
