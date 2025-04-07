import requests
from django.db.models import Max
from django.utils import timezone
from rest_framework import viewsets
from .models import Vehicle, Alert, WeightReading, Report
from .serializers import VehicleSerializer, WeightReadingSerializer, AlertSerializer, ReportSerializer
from django.core.mail import send_mail
from django.core.mail import EmailMessage
from rest_framework.pagination import PageNumberPagination
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from .serializers import UserSerializer
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import authentication_classes
from rest_framework_simplejwt.authentication import JWTAuthentication
from datetime import timedelta 
from django.db.models import Count, Avg, Q
import json
from django.core.mail import send_mail
from django.conf import settings



@authentication_classes([JWTAuthentication])
class UserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'role': 'Administrator' 
        })

class RegisterView(APIView):
    def post(self, request):
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            return Response({
                'user': serializer.data,
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LoginView(APIView):
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        user = authenticate(username=username, password=password)
        
        if user is not None:
            refresh = RefreshToken.for_user(user)
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            })
        return Response({'error': 'Invalid Credentials'}, status=status.HTTP_401_UNAUTHORIZED)
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
        self.update_vehicle_data(instance)
        self.validate_weight(instance)

    def update_vehicle_data(self, weight_reading):
        vehicle = weight_reading.vehicle

        vehicle.current_weight = weight_reading.weight
        vehicle.last_reported_weight = weight_reading.weight
        vehicle.latitude = weight_reading.latitude
        vehicle.longitude = weight_reading.longitude
        vehicle.last_reported_location = weight_reading.timestamp

        self.update_average_weight(vehicle)

        vehicle.weight_alert = (
            weight_reading.weight > vehicle.max_allowed_weight + 100 or
            weight_reading.status == 'suspected' or
            weight_reading.sensor_health == 'malfunctioning'
        )

        vehicle.status = 'active'
        vehicle.save()

    def update_average_weight(self, vehicle):
        recent_readings = WeightReading.objects.filter(
            vehicle=vehicle,
            timestamp__gte=timezone.now() - timedelta(days=30),
            status='valid',
            sensor_health='healthy'
        ).exclude(weight=0).order_by('-timestamp')[:100]

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
        elif weight_reading.weight > max_allowed + 100:
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
            severity='medium'
        )

    def create_alert(self, vehicle, alert_type, message,current_weight, latitude, longitude, location, map_url, severity='high'):
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

        vehicle.alert_history = [alert_entry] + vehicle.alert_history[:49]
        vehicle.save()

        return alert

    def send_alert_to_authorities(self, alert, lat, long):
        authority_email = "jacksonnoel510@gmail.com"
        subject = f"Overload Alert for Vehicle {alert.vehicle.vehicle_name}"

        latitude = lat
        longitude = long

        tomtom_api_key = "87GPL9AlX01QAYg9vnFZJTMozF7k46ao"
        static_map_url = f"https://api.tomtom.com/map/1/staticimage?key={tomtom_api_key}&zoom=9&center={latitude},{longitude}&format=jpg&layer=basic&style=main&width=1305&height=748&view=Unified&language=en-GB"

        response = requests.get(static_map_url)
        map_image = response.content if response.status_code == 200 else None

        google_maps_url = f"https://www.google.com/maps?q={latitude},{longitude}"
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
            'noeljackson068@gmail.com',
            [authority_email],
        )

        if map_image:
            email.attach('map_image.jpg', map_image, 'image/jpeg')

        email.send()

    def generate_map_url(self, latitude, longitude):
        return f"https://www.google.com/maps?q={latitude},{longitude}"

class AlertViewSet(viewsets.ModelViewSet):
    queryset = Alert.objects.all()
    serializer_class = AlertSerializer

    def perform_update(self, serializer):
        instance = serializer.save()
        self.resolve_alert(instance)
    def get_queryset(self):
        # Get only the latest alert for each vehicle
        return Alert.objects.filter(
            pk__in=Alert.objects.values('vehicle')
                .annotate(latest=Max('id'))
                .values_list('latest', flat=True)
        ).order_by('-timestamp')
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




class ReportView(APIView):
    print('tumefika')
    def get(self, request):
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        try:
            if start_date:
                start_date = timezone.datetime.strptime(start_date, '%Y-%m-%d').date()
            if end_date:
                end_date = timezone.datetime.strptime(end_date, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {"error": "Invalid date format. Use YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST
            )

        filters = {}
        if start_date:
            filters['timestamp__date__gte'] = start_date
        if end_date:
            filters['timestamp__date__lte'] = end_date

        # Get alert counts
        critical_alerts = Alert.objects.filter(
            severity='high',
            **filters
        ).count()
        
        warning_alerts = Alert.objects.filter(
            severity='medium',
            **filters
        ).count()

        # Get normal vehicles (no critical/warning alerts)
        alerted_vehicles = Vehicle.objects.filter(
            Q(alerts__severity='high', **filters) |
            Q(alerts__severity='medium', **filters)
        ).distinct()

        normal_vehicles = Vehicle.objects.exclude(
            id__in=alerted_vehicles.values('id')
        ).count()

        # Get overload alerts with vehicle details
        overload_alerts = Alert.objects.filter(
            Q(alert_type='overload') | Q(alert_type='sensor_malfunction'),
            **filters
        ).select_related('vehicle').order_by('-timestamp')[:50]

        return Response({
            'critical_alerts': critical_alerts,
            'warning_alerts': warning_alerts,
            'normal_vehicles': normal_vehicles,
            'overload_alerts': [
                {
                    'id': alert.id,
                    'vehicle': {
                        'id': alert.vehicle.id,
                        'vehicle_id': alert.vehicle.vehicle_id,
                        'vehicle_name': alert.vehicle.vehicle_name,
                        'max_allowed_weight': alert.vehicle.max_allowed_weight
                    },
                    'current_weight': alert.current_weight,
                    'location': alert.location,
                    'timestamp': alert.timestamp,
                    'latitude': alert.latitude,
                    'longitude': alert.longitude,
                    'severity': alert.severity,
                    'alert_type': alert.alert_type
                }
                for alert in overload_alerts
            ]
        })
class AlertFrequencyView(APIView):
    def get(self, request):
        # Get alert frequency for last 6 months
        six_months_ago = timezone.now() - timedelta(days=180)
        
        # Group by month and severity
        alerts = Alert.objects.filter(
            timestamp__gte=six_months_ago
        ).extra({
            'month': "to_char(timestamp, 'YYYY-MM')"
        }).values('month', 'severity').annotate(
            count=Count('id')
        ).order_by('month')

        # Prepare data for chart
        months = []
        critical = []
        warning = []
        
        # Initialize with empty data
        current_month = six_months_ago.strftime('%Y-%m')
        last_month = timezone.now().strftime('%Y-%m')
        
        while current_month <= last_month:
            months.append(timezone.datetime.strptime(current_month, '%Y-%m').strftime('%b'))
            critical.append(0)
            warning.append(0)
            
            # Move to next month
            year, month = map(int, current_month.split('-'))
            month += 1
            if month > 12:
                month = 1
                year += 1
            current_month = f"{year}-{month:02d}"

        # Fill with actual data
        for alert in alerts:
            try:
                index = months.index(
                    timezone.datetime.strptime(alert['month'], '%Y-%m').strftime('%b')
                )
                if alert['severity'] == 'high':
                    critical[index] = alert['count']
                elif alert['severity'] == 'medium':
                    warning[index] = alert['count']
            except ValueError:
                continue

        return Response({
            'months': months[-6:],  # Last 6 months
            'critical': critical[-6:],
            'warning': warning[-6:]
        })

class WeightTrendView(APIView):
    def get(self, request):
        # Get weight trends for the current day
        today = timezone.now().date()
        
        # Group by hour
        readings = WeightReading.objects.filter(
            timestamp__date=today,
            status='valid',
            sensor_health='healthy'
        ).extra({
            'hour': "EXTRACT(HOUR FROM timestamp)"
        }).values('hour').annotate(
            avg_weight=Avg('weight')
        ).order_by('hour')

        # Prepare data for chart
        times = ['6AM', '9AM', '12PM', '3PM', '6PM', '9PM']
        hours = [6, 9, 12, 15, 18, 21]
        avg_weights = [0] * len(hours)
        
        # Fill with actual data
        for reading in readings:
            hour = int(reading['hour'])
            if hour in hours:
                index = hours.index(hour)
                avg_weights[index] = round(reading['avg_weight'], 2)

        return Response({
            'times': times,
            'average_weights': avg_weights
        })

class AlertNotificationView(APIView):
    def post(self, request, pk):
        try:
            alert = Alert.objects.get(pk=pk)
            vehicle = alert.vehicle
            
            # Send email notification
            subject = f"Overload Alert for Vehicle {vehicle.vehicle_id}"
            message = (
                f"Alert Type: {alert.alert_type}\n"
                f"Vehicle: {vehicle.vehicle_name} ({vehicle.vehicle_id})\n"
                f"Current Weight: {alert.current_weight} kg\n"
                f"Max Allowed: {vehicle.max_allowed_weight} kg\n"
                f"Location: {alert.location}\n"
                f"Time: {alert.timestamp}\n\n"
                f"Message: {alert.message}"
            )
            
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                ['jacksonnoel510@gmail.com', 'jacksonnoel510@gmail.com'],
                fail_silently=False,
            )
            
            # Update alert to mark as notified
            alert.notified = True
            alert.save()
            
            return Response({
                'status': 'success',
                'message': 'Notification sent successfully'
            })
            
        except Alert.DoesNotExist:
            return Response(
                {'error': 'Alert not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )