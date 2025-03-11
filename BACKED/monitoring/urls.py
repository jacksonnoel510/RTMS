from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import VehicleViewSet, WeightReadingViewSet, AlertViewSet

router = DefaultRouter()
router.register(r'vehicles', VehicleViewSet)
router.register(r'weights', WeightReadingViewSet)
router.register(r'alerts', AlertViewSet)

urlpatterns = [
    path('api/', include(router.urls)),
]
