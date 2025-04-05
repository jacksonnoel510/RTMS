from rest_framework import serializers
from .models import Vehicle, WeightReading, Alert,Report

class VehicleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehicle
        fields = '__all__'

class WeightReadingSerializer(serializers.ModelSerializer):
    class Meta:
        model = WeightReading
        fields = '__all__'

class AlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = Alert
        fields = '__all__'

class ReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = '__all__'