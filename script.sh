echo "Starting Redis server..."
if ! redis-server --daemonize yes; then
    echo "Failed to start Redis server"
    exit 1
fi



#docker run -d --name redisinsight -v redisinsight_data:/data -p 5540:5540 redis/redisinsight:latest


docker exec -ti redisinsight redis-cli -h redis-server -p 6379 ping



# testing the telegram bot alert

curl -X GET "http://localhost:3000/api/cron/watchtower" -H "Authorization: Bearer supersecret"