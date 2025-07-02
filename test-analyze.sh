#!/bin/bash

# Test the analyze endpoint with actual files
echo "Testing file upload to analyze endpoint..."

# Check if files exist
SALES_FILE="reference/Sales report 2024-07-01 to 2025-06-30.csv"
PLANNING_FILE="reference/Updated_Planning_Q3_2025_with_Realistic_Targets_AF.xlsx"

if [ ! -f "$SALES_FILE" ]; then
  echo "Error: Sales file not found at $SALES_FILE"
  exit 1
fi

if [ ! -f "$PLANNING_FILE" ]; then
  echo "Error: Planning file not found at $PLANNING_FILE"
  exit 1
fi

# Get file sizes
SALES_SIZE=$(ls -lh "$SALES_FILE" | awk '{print $5}')
PLANNING_SIZE=$(ls -lh "$PLANNING_FILE" | awk '{print $5}')

echo "Sales file size: $SALES_SIZE"
echo "Planning file size: $PLANNING_SIZE"

# Test against production
URL="https://dormant-customer-tool.vercel.app/api/analyze"
echo -e "\nTesting against: $URL"

# Make the request
RESPONSE=$(curl -X POST "$URL" \
  -F "salesFile=@$SALES_FILE" \
  -F "planningFile=@$PLANNING_FILE" \
  -w "\nHTTP_STATUS:%{http_code}" \
  -s)

# Extract HTTP status
HTTP_STATUS=$(echo "$RESPONSE" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed 's/HTTP_STATUS:[0-9]*$//')

echo "HTTP Status: $HTTP_STATUS"

if [ "$HTTP_STATUS" = "200" ]; then
  echo -e "\nSuccess! Response:"
  echo "$BODY" | jq '.'
else
  echo -e "\nError! Response:"
  echo "$BODY"
fi