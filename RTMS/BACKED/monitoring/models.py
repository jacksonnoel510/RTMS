

# Create your models here.
from django.db import models
from django.utils import timezone
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
    is_currently_overloaded = models.BooleanField(
    default=False,
    help_text="Whether the vehicle is currently in an overloaded state"
)
    def __str__(self):
        return self.vehicle_name


class WeightReading(models.Model):
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE)
    #  on_delete=models.PROTECT
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
# models.py

class Penalty(models.Model):
    PENALTY_STATUS_CHOICES = [
        ('unpaid', 'Unpaid'),
        ('paid', 'Paid'),
        ('disputed', 'Disputed'),
        ('waived', 'Waived'),
    ]

    vehicle = models.ForeignKey(
        'Vehicle',
        on_delete=models.CASCADE,
        related_name='penalties',
        help_text="The vehicle that received this penalty"
    )
    
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Penalty amount in TZS"
    )
    
    overload_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="How much the vehicle was overloaded (in kg)"
    )
    
    timestamp = models.DateTimeField(
        default=timezone.now,
        help_text="When the penalty was issued"
    )
    
    paid = models.BooleanField(
        default=False,
        help_text="Whether the penalty has been paid"
    )
    
    status = models.CharField(
        max_length=10,
        choices=PENALTY_STATUS_CHOICES,
        default='unpaid',
        help_text="Current status of the penalty"
    )
    
    latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        help_text="GPS latitude where violation occurred"
    )
    
    longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        help_text="GPS longitude where violation occurred"
    )
    
    paid_date = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the penalty was paid"
    )
    
    reference_number = models.CharField(
        max_length=50,
        blank=True,
        help_text="Payment reference number"
    )
    
    notes = models.TextField(
        blank=True,
        help_text="Any additional notes about this penalty"
    )

    class Meta:
        verbose_name_plural = "penalties"
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['vehicle', 'timestamp']),
            models.Index(fields=['status', 'paid']),
        ]

    def __str__(self):
        return f"Penalty #{self.id} - {self.vehicle.vehicle_name} - {self.amount} TZS"

    def mark_as_paid(self, reference_number=None):
        """Mark this penalty as paid"""
        self.paid = True
        self.status = 'paid'
        self.paid_date = timezone.now()
        if reference_number:
            self.reference_number = reference_number
        self.save()

class PenaltyRate(models.Model):
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=50000.00,
        help_text="Current penalty amount in TZS"
    )
    
    effective_from = models.DateTimeField(
        default=timezone.now,
        help_text="When this rate became effective"
    )
    
    notes = models.TextField(
        blank=True,
        help_text="Reason for rate change"
    )

    class Meta:
        get_latest_by = 'effective_from'

    def __str__(self):
        return f"Penalty Rate: {self.amount} TZS (from {self.effective_from.date()})"

    def save(self, *args, **kwargs):
        # Ensure there's only one active rate
        if not self.pk:
            self.__class__.objects.all().update(is_active=False)
        super().save(*args, **kwargs)