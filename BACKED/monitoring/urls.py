from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    VehicleViewSet, WeightReadingViewSet, AlertViewSet,
    RegisterView, LoginView, UserView,
    AlertFrequencyView, WeightTrendView, AlertNotificationView, ReportView
)
from django.conf import settings
from django.conf.urls.static import static

router = DefaultRouter()
router.register(r'vehicles', VehicleViewSet)
router.register(r'weights', WeightReadingViewSet) 
router.register(r'alerts', AlertViewSet)

urlpatterns = [
    path('api/', include(router.urls)),
    # Authentication
    path('api/auth/register/', RegisterView.as_view(), name='register'),
    path('api/auth/login/', LoginView.as_view(), name='login'),
    path('api/auth/user/', UserView.as_view(), name='user-info'),
    
    # Custom report endpoints
    path('api/reports/summary/', ReportView.as_view(), name='report-summary'),
    path('api/reports/alert-frequency/', AlertFrequencyView.as_view(), name='alert-frequency'),
    path('api/reports/weight-trends/', WeightTrendView.as_view(), name='weight-trends'),
    
    # Alert notification
    path('api/alerts/<int:pk>/notify/', AlertNotificationView.as_view(), name='alert-notify'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)