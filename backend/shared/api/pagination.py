# Filename: backend/shared/api/pagination.py
from rest_framework.pagination import PageNumberPagination


class StandardResultsSetPagination(PageNumberPagination):
    """Standard pagination for list endpoints.

    Query params:
      - page: page number
      - page_size: override default page size (bounded by max_page_size)
    """

    page_size = 25
    page_size_query_param = "page_size"
    max_page_size = 100
