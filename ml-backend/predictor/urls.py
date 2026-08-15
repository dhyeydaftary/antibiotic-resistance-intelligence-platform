# Every route the ML backend exposes to the gateway, one-to-one with a
# view function in views.py. /predict/ is the core ML endpoint; the
# rest support the trends/history/research UI surfaces.
from django.urls import path
from .views import (
    predict_view, trends_view, dataset_stats_view,
    explain_trend_view, research_papers_view, extract_report_view,
    health_view,
)

urlpatterns = [
    path('predict/', predict_view, name='predict'),
    path('trends/', trends_view, name='trends'),
    path('dataset-stats/', dataset_stats_view, name='dataset-stats'),
    path('explain-trend/', explain_trend_view, name='explain-trend'),
    path('research-papers/', research_papers_view, name='research-papers'),
    path('extract-report/', extract_report_view, name='extract-report'),
    path('health/', health_view, name='health'),
]