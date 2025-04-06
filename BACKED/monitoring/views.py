import requests
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.response import Response
from .models import Vehicle, Alert, WeightReading, Report
from .serializers import VehicleSerializer, WeightReadingSerializer, AlertSerializer, ReportSerializer
from django.core.mail import send_mail
from django.core.mail import EmailMessage
from rest_framework.pagination import PageNumberPagination

class VehicleViewSet(viewsets.ModelViewSet):
    queryset = Vehicle.objects.all()
    serializer_class = VehicleSerializer
    pagination_class = PageNumberPagination
    
    def perform_create(self, serializer):
        instance= serializer.save()
        self.check_weight_alert(instance)
    def check_weight_alert(self, vehicle):
        
        """Logic to check if the vehicle exceeds the weight limit."""
        if vehicle.current_weight > vehicle.max_allowed_weight + 100:
            vehicle.weight_alert = True
            vehicle.save()

            # Send alert to authorities
            alert_message = f"Overload detected: {vehicle.vehicle_name} has exceeded the weight limit. Current weight: {vehicle.current_weight} kg."
            vehicle_location = f"Latitude: {vehicle.latitude}, Longitude: {vehicle.longitude}"
            alert = self.create_alert(vehicle, 'overload', alert_message, vehicle_location)

            # Send alert to authorities (can be via email, SMS, or any communication platform)
            self.send_alert_to_authorities(alert)

            # Generate map URL
            map_url = self.generate_map_url(vehicle.latitude, vehicle.longitude)
            alert.map_url = map_url
            alert.save()

    def create_alert(self, vehicle, alert_type, message, location):
        """Logic to create a new alert."""
        alert = Alert.objects.create(
            vehicle=vehicle,
            message=message,
            alert_type=alert_type,
            severity='high',
            location=location  
        )
        alert_timestamp = alert.timestamp.isoformat()
        vehicle.alert_history.append({
            'alert_type': alert_type,
            'message': message,
            'timestamp': alert_timestamp,
            'severity': alert.severity,
            'location': location
        })
        vehicle.save()
        return alert

    def send_alert_to_authorities(self, alert):
        """Send the alert to authorities (e.g., via email or SMS)."""
        authority_email = "jacksonnoel510@gmail.com"
        subject = f"Overload Alert for Vehicle {alert.vehicle.vehicle_name}"
        message = f"Alert Type: {alert.alert_type}\n" \
                  f"Message: {alert.message}\n" \
                  f"Vehicle Location: {alert.location}\n" \
                  f"Alert Severity: {alert.severity}"

        # Send email to authorities
        send_mail(subject, message, 'noeljackson068@gmail.com', [authority_email])

    def generate_map_url(self, latitude, longitude):
        """Generate a map URL for vehicle's current location."""
        map_url = f"https://www.google.com/maps?q={latitude},{longitude}"
        return map_url

class WeightReadingViewSet(viewsets.ModelViewSet):
    queryset = WeightReading.objects.all()
    serializer_class = WeightReadingSerializer

    def perform_create(self, serializer):
        instance = serializer.save()
        self.validate_weight(instance)

    def validate_weight(self, weight_reading):
        """Logic to validate weight reading."""
        if weight_reading.weight > weight_reading.vehicle.max_allowed_weight +100:
            weight_reading.status = 'suspected'
            weight_reading.save()
            latitude=weight_reading.latitude
            longitude=weight_reading.longitude
            location = f"Latitude: {latitude}, Longitude: {longitude}"
            map_url = self.generate_map_url(weight_reading.latitude, weight_reading.longitude)
            alert=self.create_alert(weight_reading.vehicle, 'overload', f"Suspected overload: {weight_reading.weight} kg for {weight_reading.vehicle.vehicle_name}",location,map_url)
            self.send_alert_to_authorities(alert,latitude,longitude)
        else:
            weight_reading.status = 'valid'
            weight_reading.save()
        

   

    def send_alert_to_authorities(self, alert,lat,long):
        """Send the alert to authorities (e.g., via email or SMS)."""
        authority_email = "jacksonnoel510@gmail.com"
        subject = f"Overload Alert for Vehicle {alert.vehicle.vehicle_name}"

        # Get latitude and longitude from alert location
        latitude = lat
        longitude = long
        print(latitude, longitude)

        # TomTom Static Image API
        tomtom_api_key = "87GPL9AlX01QAYg9vnFZJTMozF7k46ao"  # Replace with your TomTom API key

        # TomTom API request with proper format
        static_map_url = f"https://api.tomtom.com/map/1/staticimage?key={tomtom_api_key}&zoom=9&center={latitude},{longitude}&format=jpg&layer=basic&style=main&width=1305&height=748&view=Unified&language=en-GB"
        # Initialize map_image to None
        map_image = None

        # Make the request to the TomTom API to retrieve the static map image
        response = requests.get(static_map_url)

        if response.status_code == 200:
            # Get the map image content from the response
            map_image = response.content
        else:
            # Handle the case when the image could not be retrieved
            print(f"Failed to retrieve the map image. Status code: {response.status_code}")
        google_maps_url = f"https://www.google.com/maps?q={latitude},{longitude}"
        # Compose the email message
        message = f"Alert Type: {alert.alert_type}\n" \
                f"Message: {alert.message}\n" \
                f"Alert Severity: {alert.severity}\n"\
                f"click this link to check the the vehicle in google map:{google_maps_url}\n"\
                f"VEHICLE LOCATION:"

        # Create the email object
        email = EmailMessage(
            subject,
            message,
            'noeljackson068@gmail.com',
            [authority_email],
        )

        # Attach the map image to the email if it was successfully retrieved
        if map_image:
            email.attach('map_image.jpg', map_image, 'image/jpeg')

        # Send the email
        email.send()



    def generate_map_url(self, latitude, longitude):
        """Generate a map URL for vehicle's current location."""
        map_url = f"https://www.google.com/maps?q={latitude},{longitude}"
        return map_url

    def create_alert(self, vehicle, alert_type, message,location,map_url):
        """Logic to create a new alert."""
        alert = Alert.objects.create(
            vehicle=vehicle,
            message=message,
            alert_type=alert_type,
            severity='high' if alert_type == 'overload' else 'low',
            location=location,
            map_url=map_url
        )
        print(f"alert1'{alert}")
        alert_timestamp = alert.timestamp.isoformat()
        vehicle.alert_history.append({
            'alert_type': alert_type,
            'message': message,
            'timestamp': alert_timestamp,
            'severity': alert.severity,
            'location':location,
            'map_url':map_url
        })
        vehicle.save()
        return alert

class AlertViewSet(viewsets.ModelViewSet):
    queryset = Alert.objects.all()
    serializer_class = AlertSerializer

    def perform_update(self, serializer):
        instance = serializer.save()
        self.resolve_alert(instance)

    def resolve_alert(self, alert):
        """Logic to resolve an alert."""
        alert.is_resolved = True
        alert.resolved_timestamp = timezone.now()
        alert.save()


class ReportViewSet(viewsets.ModelViewSet):
    queryset = Report.objects.all()
    serializer_class = ReportSerializer

    def perform_create(self, vehicle):
        report_type=vehicle.report_type
        """Create a report manually."""
        return self.generate_report(vehicle, report_type)
    
    def generate_report(self, vehicle, report_type='weight_summary'):
        """Logic to generate a report for a vehicle."""
        if report_type == 'weight_summary':
            report_data = {
                'vehicle_id': vehicle.vehicle_id,
                'last_reported_weight': vehicle.last_reported_weight,
                'current_weight': vehicle.current_weight,
                'average_weight': vehicle.average_weight,
            }
        else:
            alerts = Alert.objects.filter(vehicle=vehicle, is_resolved=False)
            report_data = {
                'vehicle_id': vehicle.vehicle_id,
                'unresolved_alerts': [
                    {'alert_type': alert.alert_type, 'message': alert.message, 'timestamp': alert.timestamp}
                    for alert in alerts
                ]
            }
        
        report = Report.objects.create(
            vehicle=vehicle,
            report_type=report_type,
            report_data=report_data
        )
        vehicle.last_report_generated = timezone.now()
        vehicle.save()
        return report


