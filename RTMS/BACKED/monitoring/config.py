# config.py

# Email Configuration
EMAIL_CONFIG = {
    'DEFAULT_FROM_EMAIL': 'noeljackson068@gmail.com',
    'AUTHORITY_EMAILS': ['jacksonnoel510@gmail.com', 'jacksonnoel510@gmail.com'],
    'ADMIN_EMAIL': 'jacksonnoel510@gmail.com',
    'EMAIL_SUBJECT_PREFIX': '[Weight Monitoring System] ',
}

# API Keys
API_KEYS = {
    'TOMTOM_API_KEY': '87GPL9AlX01QAYg9vnFZJTMozF7k46ao',
}

# Alert Configuration
ALERT_CONFIG = {
    'OVERLOAD_THRESHOLD': 100,  # kg over max allowed weight
    'WARNING_THRESHOLD': 0,     # percentage of max allowed weight
    'CRITICAL_SEVERITY_LEVEL': 'high',
    'WARNING_SEVERITY_LEVEL': 'medium',
}

# Map Configuration
MAP_CONFIG = {
    'DEFAULT_MAP_PROVIDER': 'google',  # or 'tomtom'
    'GOOGLE_MAPS_URL_FORMAT': 'https://www.google.com/maps?q={latitude},{longitude}',
    'TOMTOM_STATIC_MAP_URL': 'https://api.tomtom.com/map/1/staticimage?key={api_key}&zoom=9&center={latitude},{longitude}&format=jpg&layer=basic&style=main&width=1305&height=748&view=Unified&language=en-GB',
}

# Report Configuration
REPORT_CONFIG = {
    'DEFAULT_REPORT_DAYS': 30,
    'MAX_ALERT_HISTORY': 50,
}

# Weight Reading Configuration
WEIGHT_READING_CONFIG = {
    'VALID_READING_DAYS': 30,
    'MAX_READINGS_FOR_AVERAGE': 100,
}