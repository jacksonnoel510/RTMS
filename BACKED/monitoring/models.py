

# Create your models here.
from django.db import models

class Vehicle(models.Model):
    vehicle_id = models.CharField(max_length=20)
    description = models.CharField(max_length=255)
    owner = models.CharField(max_length=100)
    last_reported_weight = models.FloatField(default=0.0)
    max_allowed_weight = models.FloatField(default=0.0)

class WeightReading(models.Model):
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE)
    weight = models.FloatField()
    timestamp = models.DateTimeField(auto_now_add=True)

class Alert(models.Model):
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE)
    message = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    is_resolved = models.BooleanField(default=False)
