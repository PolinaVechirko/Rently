using System;

namespace Rently.Application.DTOs
{
    public class ReviewDto
    {
        public int Id { get; set; }
        public string ReviewerName { get; set; } = string.Empty;
        public string? ReviewerAvatarUrl { get; set; }
        public int Rating { get; set; }
        public string? Comment { get; set; }
        public string? HostReply { get; set; }
        public DateTime? HostReplyCreatedAt { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
