from django.contrib import admin
from django.contrib.auth.models import Group
from .models import (
    Vehicle,
    WeightReading,
    Alert,
    Report,
    Penalty,
    PenaltyRate
)

# Unregister default Group model if you don't need it
admin.site.unregister(Group)

@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display = ('vehicle_id', 'vehicle_name', 'owner', 'current_weight', 'max_allowed_weight', 'status')
    list_filter = ('status', 'is_currently_overloaded', 'weight_alert')
    search_fields = ('vehicle_id', 'vehicle_name', 'owner', 'driver')
    readonly_fields = ('last_reported_location', 'timestamp')
    fieldsets = (
        ('Basic Information', {
            'fields': ('vehicle_name', 'vehicle_id', 'description', 'owner', 'driver', 'vehicle_image')
        }),
        ('Weight Information', {
            'fields': ('current_weight', 'max_allowed_weight', 'last_reported_weight', 'average_weight')
        }),
        ('Location Data', {
            'fields': ('latitude', 'longitude', 'last_reported_location')
        }),
        ('Status Information', {
            'fields': ('status', 'is_currently_overloaded', 'weight_alert', 'alert_history')
        }),
    )

@admin.register(WeightReading)
class WeightReadingAdmin(admin.ModelAdmin):
    list_display = ('vehicle', 'weight', 'timestamp', 'status', 'sensor_health')
    list_filter = ('status', 'sensor_health', 'timestamp')
    search_fields = ('vehicle__vehicle_id', 'vehicle__vehicle_name', 'sensor_id')
    date_hierarchy = 'timestamp'
    raw_id_fields = ('vehicle',)

@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    list_display = ('vehicle', 'alert_type', 'severity', 'timestamp', 'notified')
    list_filter = ('alert_type', 'severity', 'notified')
    search_fields = ('vehicle__vehicle_id', 'vehicle__vehicle_name', 'message')
    date_hierarchy = 'timestamp'
    readonly_fields = ('timestamp',)

@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ('vehicle', 'report_type', 'generated_at')
    list_filter = ('report_type', 'generated_at')
    search_fields = ('vehicle__vehicle_id', 'vehicle__vehicle_name')
    date_hierarchy = 'generated_at'
    readonly_fields = ('generated_at',)

@admin.register(Penalty)
class PenaltyAdmin(admin.ModelAdmin):
    list_display = ('vehicle', 'amount', 'overload_amount', 'status', 'paid', 'timestamp')
    list_filter = ('status', 'paid', 'timestamp')
    search_fields = ('vehicle__vehicle_id', 'vehicle__vehicle_name', 'reference_number')
    date_hierarchy = 'timestamp'
    actions = ['mark_as_paid']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('vehicle', 'amount', 'overload_amount')
        }),
        ('Status', {
            'fields': ('status', 'paid', 'paid_date', 'reference_number')
        }),
        ('Location', {
            'fields': ('latitude', 'longitude')
        }),
        ('Additional', {
            'fields': ('notes', 'timestamp')
        }),
    )
    
    def mark_as_paid(self, request, queryset):
        updated = queryset.update(paid=True, status='paid', paid_date=timezone.now())
        self.message_user(request, f"{updated} penalties marked as paid.")
    mark_as_paid.short_description = "Mark selected penalties as paid"

@admin.register(PenaltyRate)
class PenaltyRateAdmin(admin.ModelAdmin):
    list_display = ('amount', 'effective_from')
    readonly_fields = ('effective_from',)
    
    def save_model(self, request, obj, form, change):
        # Make sure there's only one active rate
        if not change:
            PenaltyRate.objects.all().delete()
        super().save_model(request, obj, form, change)