class WeightReadingViewSet(viewsets.ModelViewSet):
    queryset = WeightReading.objects.all()
    serializer_class = WeightReadingSerializer

    def perform_create(self, serializer):
        instance = serializer.save()
        self.update_vehicle_data(instance)
        self.validate_weight(instance)

    def update_vehicle_data(self, weight_reading):
        vehicle = weight_reading.vehicle

        # Track previous state before updating
        previous_state = {
            'was_overloaded': vehicle.is_currently_overloaded,
            'current_weight': vehicle.current_weight
        }

        vehicle.current_weight = weight_reading.weight
        vehicle.last_reported_weight = weight_reading.weight
        vehicle.latitude = weight_reading.latitude
        vehicle.longitude = weight_reading.longitude
        vehicle.last_reported_location = weight_reading.timestamp

        self.update_average_weight(vehicle)

        # Determine if currently overloaded
        vehicle.is_currently_overloaded = (
            weight_reading.weight > vehicle.max_allowed_weight + ALERT_CONFIG['OVERLOAD_THRESHOLD']
        )

        vehicle.weight_alert = (
            vehicle.is_currently_overloaded or
            weight_reading.status == 'suspected' or
            weight_reading.sensor_health == 'malfunctioning'
        )

        vehicle.status = 'active'
        vehicle.save()

        # Check for state transition that warrants a penalty
        self.check_for_penalty(vehicle, weight_reading, previous_state)

    def check_for_penalty(self, vehicle, weight_reading, previous_state):
        """
        Check if we need to issue a penalty based on state transition:
        - From normal to overloaded = new penalty
        - From overloaded to normal = reset tracking
        """
        current_weight = weight_reading.weight
        max_allowed = vehicle.max_allowed_weight
        overload_threshold = ALERT_CONFIG['OVERLOAD_THRESHOLD']
        
        # Check if transitioned from normal to overloaded
        if (not previous_state['was_overloaded'] and 
            current_weight > max_allowed + overload_threshold):
            
            # Create a new penalty
            self.create_penalty(vehicle, weight_reading)
            
        # If returned to normal weight, we'll be ready for next penalty
        elif (previous_state['was_overloaded'] and 
              current_weight <= max_allowed):
            
            # Vehicle returned to normal state - no action needed
            pass

    def create_penalty(self, vehicle, weight_reading):
        """Create a new penalty record for the vehicle"""
        from .models import Penalty, PenaltyRate  # Avoid circular imports
        
        try:
            with transaction.atomic():
                # Get the current penalty rate
                rate = PenaltyRate.objects.get(id=1)
                
                # Calculate overload amount
                overload_amount = weight_reading.weight - vehicle.max_allowed_weight
                
                # Create the penalty
                Penalty.objects.create(
                    vehicle=vehicle,
                    overload_amount=overload_amount,
                    amount=rate.amount,
                    timestamp=weight_reading.timestamp,
                    latitude=weight_reading.latitude,
                    longitude=weight_reading.longitude,
                    paid=False
                )
                
                # Create an alert about the penalty
                self.create_penalty_alert(vehicle, weight_reading, rate.amount)
                
        except Exception as e:
            # Log the error but don't fail the weight reading
            logger.error(f"Failed to create penalty: {str(e)}")

    def create_penalty_alert(self, vehicle, weight_reading, penalty_amount):
        """Create an alert about the penalty that was issued"""
        location = f"Latitude: {weight_reading.latitude}, Longitude: {weight_reading.longitude}"
        map_url = self.generate_map_url(weight_reading.latitude, weight_reading.longitude)
        
        message = (
            f"New penalty issued: {penalty_amount:,} TZS for overload violation. "
            f"Current weight: {weight_reading.weight:,} kg "
            f"(Max allowed: {vehicle.max_allowed_weight:,} kg) "
            f"for {vehicle.vehicle_name}"
        )

        alert = self.create_alert(
            vehicle,
            'penalty_issued',
            message,
            weight_reading.weight,
            weight_reading.latitude,
            weight_reading.longitude,
            location,
            map_url,
            severity=ALERT_CONFIG['CRITICAL_SEVERITY_LEVEL']
        )
        
        # Send notification to authorities
        self.send_alert_to_authorities(alert, weight_reading.latitude, weight_reading.longitude)

    def update_average_weight(self, vehicle):
        recent_readings = WeightReading.objects.filter(
            vehicle=vehicle,
            timestamp__gte=timezone.now() - timedelta(days=WEIGHT_READING_CONFIG['VALID_READING_DAYS']),
            status='valid',
            sensor_health='healthy'
        ).exclude(weight=0).order_by('-timestamp')[:WEIGHT_READING_CONFIG['MAX_READINGS_FOR_AVERAGE']]

        if recent_readings.exists():
            total_weight = sum(r.weight for r in recent_readings)
            vehicle.average_weight = total_weight / len(recent_readings)
        else:
            vehicle.average_weight = None

    def validate_weight(self, weight_reading):
        vehicle = weight_reading.vehicle
        max_allowed = vehicle.max_allowed_weight

        if weight_reading.sensor_health == 'malfunctioning':
            weight_reading.status = 'suspected'
            self.create_sensor_malfunction_alert(weight_reading)
        elif weight_reading.weight > max_allowed + ALERT_CONFIG['OVERLOAD_THRESHOLD']:
            weight_reading.status = 'suspected'
            self.create_overload_alert(weight_reading)
        elif weight_reading.weight > max_allowed:
            weight_reading.status = 'valid'
            self.create_warning_notification(weight_reading)
        else:
            weight_reading.status = 'valid'

        weight_reading.save()

    def create_overload_alert(self, weight_reading):
        location = f"Latitude: {weight_reading.latitude}, Longitude: {weight_reading.longitude}"
        map_url = self.generate_map_url(weight_reading.latitude, weight_reading.longitude)
        message = (
            f"Suspected overload: {weight_reading.weight} kg "
            f"(Max allowed: {weight_reading.vehicle.max_allowed_weight} kg) "
            f"for {weight_reading.vehicle.vehicle_name}"
        )

        alert = self.create_alert(
            weight_reading.vehicle,
            'overload',
            message,
            weight_reading.weight,
            weight_reading.latitude,
            weight_reading.longitude,
            location,
            map_url
        )
        self.send_alert_to_authorities(alert, weight_reading.latitude, weight_reading.longitude)

    def create_sensor_malfunction_alert(self, weight_reading):
        location = f"Latitude: {weight_reading.latitude}, Longitude: {weight_reading.longitude}"
        map_url = self.generate_map_url(weight_reading.latitude, weight_reading.longitude)
        message = (
            f"Sensor malfunction detected for {weight_reading.vehicle.vehicle_name}. "
            f"Reported weight: {weight_reading.weight} kg"
        )

        self.create_alert(
            weight_reading.vehicle,
            'sensor_malfunction',
            message,
            weight_reading.weight,
            weight_reading.latitude,
            weight_reading.longitude,
            location,
            map_url
        )

    def create_warning_notification(self, weight_reading):
        location = f"Latitude: {weight_reading.latitude}, Longitude: {weight_reading.longitude}"
        map_url = self.generate_map_url(weight_reading.latitude, weight_reading.longitude)
        message = (
            f"Vehicle approaching max weight: {weight_reading.weight} kg "
            f"(Max allowed: {weight_reading.vehicle.max_allowed_weight} kg) "
            f"for {weight_reading.vehicle.vehicle_name}"
        )

        self.create_alert(
            weight_reading.vehicle,
            'weight_warning',
            message,
            weight_reading.weight,
            weight_reading.latitude,
            weight_reading.longitude,
            location,
            map_url,
            severity=ALERT_CONFIG['WARNING_SEVERITY_LEVEL']
        )

    def create_alert(self, vehicle, alert_type, message, current_weight, latitude, longitude, location, map_url, severity=ALERT_CONFIG['CRITICAL_SEVERITY_LEVEL']):
        alert = Alert.objects.create(
            vehicle=vehicle,
            message=message,
            alert_type=alert_type,
            severity=severity,
            latitude=latitude,
            longitude=longitude,
            current_weight=current_weight,
            location=location,
            map_url=map_url
        )

        alert_entry = {
            'alert_type': alert_type,
            'message': message,
            'timestamp': alert.timestamp.isoformat(),
            'severity': severity,
            'location': location,
            'map_url': map_url
        }

        vehicle.alert_history = [alert_entry] + vehicle.alert_history[:REPORT_CONFIG['MAX_ALERT_HISTORY']-1]
        vehicle.save()

        return alert

    def send_alert_to_authorities(self, alert, lat, long):
        subject = f"{EMAIL_CONFIG['EMAIL_SUBJECT_PREFIX']}Overload Alert for Vehicle {alert.vehicle.vehicle_name}"

        tomtom_api_key = API_KEYS['TOMTOM_API_KEY']
        static_map_url = MAP_CONFIG['TOMTOM_STATIC_MAP_URL'].format(
            api_key=tomtom_api_key,
            latitude=lat,
            longitude=long
        )

        response = requests.get(static_map_url)
        map_image = response.content if response.status_code == 200 else None

        google_maps_url = MAP_CONFIG['GOOGLE_MAPS_URL_FORMAT'].format(
            latitude=lat,
            longitude=long
        )
        
        message = (
            f"Alert Type: {alert.alert_type}\n"
            f"Message: {alert.message}\n"
            f"Alert Severity: {alert.severity}\n"
            f"Click this link to check the vehicle on Google Maps: {google_maps_url}\n"
            f"VEHICLE LOCATION:"
        )

        email = EmailMessage(
            subject,
            message,
            EMAIL_CONFIG['DEFAULT_FROM_EMAIL'],
            EMAIL_CONFIG['AUTHORITY_EMAILS'],
        )

        if map_image:
            email.attach('map_image.jpg', map_image, 'image/jpeg')

        email.send()

    def generate_map_url(self, latitude, longitude):
        return MAP_CONFIG['GOOGLE_MAPS_URL_FORMAT'].format(
            latitude=latitude,
            longitude=longitude
        )
   