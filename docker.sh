docker build . -t fff/node-web-app
docker run -p 5000:5000 -p 7000:7000 fff/node-web-app