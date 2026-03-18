#!/bin/bash

BASE_DIR="memesection"
OUTPUT_FILE="stickers.json"

echo "{" > $OUTPUT_FILE

FIRST_CATEGORY=true

for dir in "$BASE_DIR"/*/; do
    CATEGORY=$(basename "$dir")

    # Skip if not directory
    [ -d "$dir" ] || continue

    if [ "$FIRST_CATEGORY" = true ]; then
        FIRST_CATEGORY=false
    else
        echo "," >> $OUTPUT_FILE
    fi

    echo -n "  \"$CATEGORY\": [" >> $OUTPUT_FILE

    FIRST_FILE=true

    for file in "$dir"*.webp; do
        FILENAME=$(basename "$file")

        if [ "$FIRST_FILE" = true ]; then
            FIRST_FILE=false
        else
            echo -n "," >> $OUTPUT_FILE
        fi

        echo -n "\"$FILENAME\"" >> $OUTPUT_FILE
    done

    echo -n "]" >> $OUTPUT_FILE
done

echo "" >> $OUTPUT_FILE
echo "}" >> $OUTPUT_FILE

echo "✅ stickers.json generated successfully!"
