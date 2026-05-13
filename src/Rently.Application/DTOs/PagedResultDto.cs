using System.Collections.Generic;

namespace Rently.Application.DTOs
{
    public class PagedResultDto<T>
    {
        public IReadOnlyList<T> Items { get; set; } = new List<T>();
        public int Total { get; set; }
        public int Limit { get; set; }
        public int Skip { get; set; }
    }
}

