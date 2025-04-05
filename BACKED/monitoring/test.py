from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from .models import Vehicle, WeightReading, Alert, Report
from django.utils import timezone


class VehicleViewSetTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.vehicle = Vehicle.objects.create(
            vehicle_name="Truck A",
            vehicle_id="TRK123",
            description="Transport Truck",
            owner="John Doe",
            last_reported_weight=4000,
            max_allowed_weight=5000,
            current_weight=4000,
            weight_alert=False,
            latitude=-1.2921,
            longitude=36.8219,
            status="active"
        )

    def test_update_weight_alert(self):
        """Test the custom action to update weight alert"""
        url = f'/vehicles/{self.vehicle.id}/update_weight_alert/'
        self.vehicle.current_weight = 6000  # Exceeds max allowed weight
        self.vehicle.save()

        response = self.client.patch(url)
        self.vehicle.refresh_from_db()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(self.vehicle.weight_alert)


class WeightReadingViewSetTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.vehicle = Vehicle.objects.create(
            vehicle_name="Truck B",
            vehicle_id="TRK124",
            description="Heavy-duty Truck",
            owner="Alice Doe",
            last_reported_weight=3000,
            max_allowed_weight=4500,
            current_weight=3000,
            weight_alert=False,
            latitude=-1.2921,
            longitude=36.8219,
            status="active"
        )

    def test_create_weight_reading_and_trigger_alert(self):
        """Test creating a weight reading and check if alert is triggered"""
        url = f'/vehicles/{self.vehicle.id}/weight_readings/create_reading/'
        data = {
            'weight': 5000,
            'sensor_id': 'SENSOR001',
            'status': 'valid',
            'sensor_health': 'healthy'
        }

        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Check if alert is created
        alert = Alert.objects.filter(vehicle=self.vehicle).first()
        self.assertIsNotNone(alert)
        self.assertEqual(alert.alert_type, "overload")
        self.assertEqual(alert.severity, "high")
        self.assertTrue(self.vehicle.weight_alert)  # Alert should be triggered


class AlertViewSetTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.vehicle = Vehicle.objects.create(
            vehicle_name="Truck C",
            vehicle_id="TRK125",
            description="Delivery Truck",
            owner="Eve Doe",
            last_reported_weight=2000,
            max_allowed_weight=3500,
            current_weight=2000,
            weight_alert=False,
            latitude=-1.2921,
            longitude=36.8219,
            status="active"
        )

    def test_alert_creation(self):
        """Test alert creation via the viewset"""
        alert = Alert.objects.create(
            vehicle=self.vehicle,
            message="Overload detected",
            alert_type="overload",
            severity="high",
            location="Downtown",
            map_url="http://maps.example.com"
        )
        self.assertEqual(alert.vehicle, self.vehicle)
        self.assertEqual(alert.alert_type, "overload")
        self.assertEqual(alert.severity, "high")


class ReportViewSetTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.vehicle = Vehicle.objects.create(
            vehicle_name="Truck D",
            vehicle_id="TRK126",
            description="Mining Truck",
            owner="Bob Doe",
            last_reported_weight=1000,
            max_allowed_weight=3000,
            current_weight=1000,
            weight_alert=False,
            latitude=-1.2921,
            longitude=36.8219,
            status="active"
        )

    def test_report_generation(self):
        """Test report generation for vehicle"""
        report_data = {"average_weight": 2500, "weight_summary": "Summary data"}
        report = Report.objects.create(
            vehicle=self.vehicle,
            report_type="weight_summary",
            report_data=report_data
        )

        self.assertEqual(report.report_type, "weight_summary")
        self.assertEqual(report.report_data["average_weight"], 2500)
        self.assertIsNotNone(report.generated_at)


class VehicleListViewTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_vehicle_list(self):
        """Test that all vehicles can be retrieved via the API"""
        vehicle1 = Vehicle.objects.create(
            vehicle_name="Truck E",
            vehicle_id="TRK127",
            description="Transport Truck",
            owner="John Doe",
            last_reported_weight=3500,
            max_allowed_weight=4000,
            current_weight=3500,
            weight_alert=False,
            latitude=-1.2921,
            longitude=36.8219,
            status="active"
        )
        vehicle2 = Vehicle.objects.create(
            vehicle_name="Truck F",
            vehicle_id="TRK128",
            description="Transport Truck",
            owner="Jane Doe",
            last_reported_weight=2000,
            max_allowed_weight=3000,
            current_weight=2000,
            weight_alert=False,
            latitude=-1.2921,
            longitude=36.8219,
            status="inactive"
        )

        response = self.client.get('/vehicles/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)  # Two vehicles created


