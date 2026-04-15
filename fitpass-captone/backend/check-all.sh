#!/bin/sh
# Script: check-all.sh
# Mục đích: Build, kiểm tra type, lint và test backend trước khi deploy

set -e

# 1. Kiểm tra lỗi TypeScript
npx tsc --noEmit

echo "✅ TypeScript check passed."

# 2. Kiểm tra lint (nếu có eslint)
if [ -f .eslintrc.js ] || [ -f .eslintrc.json ]; then
  npx eslint .
  echo "✅ ESLint check passed."
else
  echo "⚠️  No ESLint config found, skipping lint."
fi

# 3. Chạy test tự động (nếu có)
if [ -f jest.config.js ] || [ -f jest.config.ts ] || [ -d tests ] || [ -d __tests__ ]; then
  npx jest --passWithNoTests
  echo "✅ Test suite passed."
else
  echo "⚠️  No test config found, skipping tests."
fi

echo "🎉 All checks passed! Ready to deploy."
