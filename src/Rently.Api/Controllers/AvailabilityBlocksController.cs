using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Rently.Api.Abstractions;
using Rently.Application.DTOs;
using Rently.Application.Interfaces;

namespace Rently.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Host,Both")]
    public class AvailabilityBlocksController : ControllerBase
    {
        private readonly IAvailabilityBlockService _service;
        private readonly ICurrentUserService _currentUser;

        public AvailabilityBlocksController(IAvailabilityBlockService service, ICurrentUserService currentUser)
        {
            _service = service;
            _currentUser = currentUser;
        }

        [HttpGet]
        public async Task<ActionResult> Get([FromQuery] int accommodationId, CancellationToken cancellationToken)
        {
            var userId = _currentUser.GetRequiredUserId();
            var blocks = await _service.GetBlocksAsync(userId, accommodationId, cancellationToken);
            if (blocks == null) return NotFound();

            return Ok(blocks);
        }

        [HttpPost]
        public async Task<ActionResult> Create([FromBody] CreateAvailabilityBlockDto dto, [FromQuery] int accommodationId, CancellationToken cancellationToken)
        {
            var userId = _currentUser.GetRequiredUserId();
            var block = await _service.CreateBlockAsync(userId, accommodationId, dto, cancellationToken);
            if (block == null) return NotFound();

            return Ok(block);
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> Delete(int id, [FromQuery] int accommodationId, CancellationToken cancellationToken)
        {
            var userId = _currentUser.GetRequiredUserId();
            var deleted = await _service.DeleteBlockAsync(userId, accommodationId, id, cancellationToken);
            if (deleted != true) return NotFound();

            return NoContent();
        }
    }
}
