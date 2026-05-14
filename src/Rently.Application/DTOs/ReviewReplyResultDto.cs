using System;

namespace Rently.Application.DTOs
{
    public class ReviewReplyResultDto
    {
        public int Id { get; set; }
        public string? HostReply { get; set; }
        public DateTime? HostReplyCreatedAt { get; set; }
    }
}
