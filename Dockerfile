# Use an official lightweight Python image
FROM python:3.11-slim

# Set environment variables to ensure Python output is logged and no .pyc files are generated
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    FLASK_APP=app.py

# Set the working directory inside the container
WORKDIR /app

# Copy the requirements file and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire application code into the container
COPY . .

# Expose the port that Flask will run on
EXPOSE 5000

# Start the Flask app bound to all interfaces so it can be accessed outside the container
CMD ["flask", "run", "--host=0.0.0.0", "--port=5000"]
