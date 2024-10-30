#!/bin/bash

# Login to ECR
aws ecr get-login-password --region us-west-1 | docker login --username AWS --password-stdin 022499016824.dkr.ecr.us-west-1.amazonaws.com

# Build and push the web image
docker buildx build --platform linux/amd64 -t 022499016824.dkr.ecr.us-west-1.amazonaws.com/lunaris-web:latest -f Dockerfile.web .
docker push 022499016824.dkr.ecr.us-west-1.amazonaws.com/lunaris-web:latest

# Build and push the worker image
docker buildx build --platform linux/amd64 -t 022499016824.dkr.ecr.us-west-1.amazonaws.com/lunaris-worker:latest -f Dockerfile.worker .
docker push 022499016824.dkr.ecr.us-west-1.amazonaws.com/lunaris-worker:latest

# Done
echo "Images built and pushed to ECR"
