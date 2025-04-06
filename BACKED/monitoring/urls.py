from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import VehicleViewSet, WeightReadingViewSet, AlertViewSet,ReportViewSet
from django.conf import settings
from django.conf.urls.static import static
from .views import RegisterView, LoginView,UserView

router = DefaultRouter()
router.register(r'vehicles', VehicleViewSet)
router.register(r'weights', WeightReadingViewSet)
router.register(r'alerts', AlertViewSet)
router.register(r'reports',ReportViewSet)

urlpatterns = [
    path('api/', include(router.urls)),
    path('api/auth/register/', RegisterView.as_view(), name='register'),
    path('api/auth/login/', LoginView.as_view(), name='login'),
    path('api/auth/user/', UserView.as_view(), name='user_info'),

]
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)