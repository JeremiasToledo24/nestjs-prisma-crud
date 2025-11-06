# Detener todos los contenedores
docker stop $(docker ps -aq)

# Eliminar todos los contenedores
docker rm $(docker ps -aq)

# Eliminar todas las imágenes
docker rmi $(docker images -q) -f

# Eliminar todos los volúmenes
docker volume rm $(docker volume ls -q) -f

# Limpiar sistema completo
docker system prune -a --volumes -f

# Crear la red n8n_network si no existe
docker network create n8n_network 2>$null

# Ejecutar docker compose
docker compose up -d