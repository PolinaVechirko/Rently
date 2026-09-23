using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Rently.Api.Abstractions;
using Rently.Application.DTOs;
using Rently.Application.Interfaces;

namespace Rently.Api.Controllers;

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
    public async Task<ActionResult<IReadOnlyList<AvailabilityBlockDto>>> Get([FromQuery] int accommodationId, CancellationToken cancellationToken)
    {
        var userId = _currentUser.GetRequiredUserId();
        var blocks = await _service.GetBlocksAsync(userId, accommodationId, cancellationToken);
        return Ok(blocks);
    }

    [HttpPost]
    public async Task<ActionResult<AvailabilityBlockDto>> Create([FromBody] CreateAvailabilityBlockDto dto, [FromQuery] int accommodationId, CancellationToken cancellationToken)
    {
        var userId = _currentUser.GetRequiredUserId();
        var block = await _service.CreateBlockAsync(userId, accommodationId, dto, cancellationToken);
        return Ok(block);
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(int id, [FromQuery] int accommodationId, CancellationToken cancellationToken)
    {
        var userId = _currentUser.GetRequiredUserId();
        await _service.DeleteBlockAsync(userId, accommodationId, id, cancellationToken);
        return NoContent();
    }
}
