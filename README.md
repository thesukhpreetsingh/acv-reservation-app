# Nevo Test Drive Reservation service

Welcome


### To Build the app run the following command (Please make sure that the docker is available)
```
docker compose up -d --build
```

### To Access the web app once the app built is complete
```
http://localhost:3001
```

### To Add a few other models or cars respective to location, days available, time gap/difference between all of the successful bookings
```
http://localhost:3001/admin
```

### to clean up everything
```
docker compose down --rmi all -v --remove-orphans
```