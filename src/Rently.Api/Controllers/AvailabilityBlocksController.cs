using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Threading.Tasks;
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

        public AvailabilityBlocksController(IAvailabilityBlockService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<ActionResult> Get([FromQuery] int accommodationId)
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var blocks = await _service.GetBlocksAsync(userId, accommodationId);
            if (blocks == null) return NotFound();

            return Ok(blocks);
        }

        [HttpPost]
        public async Task<ActionResult> Create([FromBody] CreateAvailabilityBlockDto dto, [FromQuery] int accommodationId)
        {
            try
            {
                var userId = GetCurrentUserId();
                if (userId == null) return Unauthorized();

                var block = await _service.CreateBlockAsync(userId, accommodationId, dto);
                if (block == null) return NotFound();

                return Ok(block);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> Delete(int id, [FromQuery] int accommodationId)
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var deleted = await _service.DeleteBlockAsync(userId, accommodationId, id);
            if (deleted == null) return NotFound();
            if (deleted == false) return NotFound();

            return NoContent();
        }

        private string? GetCurrentUserId()
        {
            return User.FindFirstValue(ClaimTypes.NameIdentifier);
        }
    }
}
