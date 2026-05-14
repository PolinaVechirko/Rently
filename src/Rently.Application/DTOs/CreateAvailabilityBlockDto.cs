using System;

namespace Rently.Application.DTOs
{
    public class CreateAvailabilityBlockDto
    {
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string? Note { get; set; }
    }
}
