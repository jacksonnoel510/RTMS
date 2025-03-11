from django.shortcuts import render

# Create your views here.
from rest_framework import viewsets
from .models import Vehicle, WeightReading, Alert
from .serializers import VehicleSerializer, WeightReadingSerializer, AlertSerializer

class VehicleViewSet(viewsets.ModelViewSet):
    queryset = Vehicle.objects.all()
    serializer_class = VehicleSerializer

class WeightReadingViewSet(viewsets.ModelViewSet):
    queryset = WeightReading.objects.all()
    serializer_class = WeightReadingSerializer

class AlertViewSet(viewsets.ModelViewSet):
    queryset = Alert.objects.all()
    serializer_class = AlertSerializer
