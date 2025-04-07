

# Create your models here.
from django.db import models

class Vehicle(models.Model):
    vehicle_name = models.CharField(max_length=50, default="Unknown Vehicle")
    vehicle_image = models.ImageField(upload_to='vehicle_images/', null=True, blank=True)
    vehicle_id = models.CharField(max_length=20)
    description = models.CharField(max_length=255)
    driver= models.CharField(max_length=100 ,null=True)
    owner = models.CharField(max_length=100)
    last_reported_weight = models.FloatField(default=0.0)
    max_allowed_weight = models.FloatField(default=0.0)
    current_weight = models.FloatField(default=0.0)
    weight_alert = models.BooleanField(default=False)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    last_reported_location = models.DateTimeField(auto_now=True)
    last_report_generated = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=[('active', 'Active'), ('inactive', 'Inactive')], default='inactive')
    alert_history = models.JSONField(default=list, blank=True)
    average_weight = models.FloatField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True,null=True)

    def __str__(self):
        return self.vehicle_name


class WeightReading(models.Model):
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    weight = models.FloatField()
    timestamp = models.DateTimeField(auto_now_add=True)
    sensor_id = models.CharField(max_length=50, null=True, blank=True)  
    status = models.CharField(max_length=20, choices=[('valid', 'Valid'), ('suspected', 'Suspected')], default='valid')
    sensor_health = models.CharField(max_length=50, choices=[('healthy', 'Healthy'), ('malfunctioning', 'Malfunctioning')], default='healthy')

    def __str__(self):
        return f"Reading for {self.vehicle.vehicle_name} at {self.timestamp}"
class Alert(models.Model):
    SEVERITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High')
    ]
    
    ALERT_TYPES = [
        ('overload', 'Overload'),
        ('sensor_malfunction', 'Sensor Malfunction'),
        ('other', 'Other')
    ]
    
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name='alerts')
    alert_type = models.CharField(max_length=20, choices=ALERT_TYPES)
    message = models.TextField()
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES)
    current_weight = models.FloatField(null=True)
    location = models.CharField(max_length=255,null=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    notified = models.BooleanField(default=False)
    map_url = models.URLField(blank=True, null=True)
    class Meta:
        ordering = ['-timestamp']

class Report(models.Model):
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE)
    report_type = models.CharField(max_length=50, choices=[('weight_summary', 'Weight Summary'), ('alert_summary', 'Alert Summary')])
    report_data = models.JSONField()  
    generated_at = models.DateTimeField(auto_now_add=True)
    file_url = models.URLField(null=True, blank=True) 
